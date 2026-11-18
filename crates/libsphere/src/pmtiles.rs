use std::collections::{HashMap, VecDeque};
use std::fmt;
use std::fs::File;
use std::future::Future;
use std::sync::{Arc, Mutex, MutexGuard};

use ::pmtiles::{
    Compression, DirEntry, Directory, DirectoryCache, PmTilesReader, PmtResult, TileCoord, TileId,
    TileType,
};
use mbtiles::tile::Tile;
use serde_json::Value;
use tilejson::Tilejson3;

use crate::error::{Result, SphereError};
use crate::mbtiles::sphere_url;

/// TileJSON keys the header owns: metadata must not override them.
const HEADER_KEYS: [&str; 7] = [
    "tiles", "format", "minzoom", "maxzoom", "bounds", "center", "scheme",
];

fn tile_format(tile_type: TileType) -> Option<&'static str> {
    match tile_type {
        TileType::Mvt => Some("pbf"),
        TileType::Png => Some("png"),
        TileType::Jpeg => Some("jpg"),
        TileType::Webp => Some("webp"),
        TileType::Avif | TileType::Mlt | TileType::Unknown => None,
    }
}

/// Directories kept in memory per archive; the oldest inserted is evicted first.
const MAX_CACHED_DIRECTORIES: usize = 64;

#[derive(Default)]
struct CachedDirectories {
    directories: HashMap<u64, Arc<Directory>>,
    /// Offsets in insertion order, oldest first.
    order: VecDeque<u64>,
}

/// A directory cache bounded to `MAX_CACHED_DIRECTORIES`, evicting in insertion order.
#[derive(Default)]
struct BoundedCache {
    cached: Mutex<CachedDirectories>,
}

impl BoundedCache {
    /// A poisoned lock is treated as an empty cache: the caller fetches without caching.
    fn lock(&self) -> Option<MutexGuard<'_, CachedDirectories>> {
        self.cached.lock().ok()
    }

    #[cfg(test)]
    fn len(&self) -> usize {
        self.lock().map(|c| c.directories.len()).unwrap_or_default()
    }
}

impl DirectoryCache for BoundedCache {
    async fn get_dir_entry_or_insert(
        &self,
        offset: u64,
        tile_id: TileId,
        fetcher: impl Future<Output = PmtResult<Directory>> + Send,
    ) -> PmtResult<Option<DirEntry>> {
        let hit = self.lock().and_then(|c| c.directories.get(&offset).cloned());
        if let Some(directory) = hit {
            return Ok(directory.find_tile_id(tile_id).copied());
        }
        let directory = Arc::new(fetcher.await?);
        let entry = directory.find_tile_id(tile_id).copied();
        if let Some(mut cached) = self.lock() {
            if cached.directories.insert(offset, directory).is_none() {
                cached.order.push_back(offset);
            }
            while cached.directories.len() > MAX_CACHED_DIRECTORIES {
                let Some(oldest) = cached.order.pop_front() else {
                    break;
                };
                cached.directories.remove(&oldest);
            }
        }
        Ok(entry)
    }
}

pub struct Pmtiles {
    pub name: String,
    path: String,
    reader: PmTilesReader<File, BoundedCache>,
}

impl fmt::Debug for Pmtiles {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Pmtiles")
            .field("name", &self.name)
            .field("path", &self.path)
            .finish()
    }
}

impl Pmtiles {
    /// Opens the archive and validates that its tile type and compression are supported.
    pub fn new(name: String, path: String) -> Result<Pmtiles> {
        let fail = |detail: String| SphereError::Pmtiles { path: path.clone(), detail };
        let file = File::open(&path).map_err(|e| fail(e.to_string()))?;
        let reader = PmTilesReader::try_from_source_and_cache(file, BoundedCache::default())
            .map_err(|e| fail(e.to_string()))?;
        let header = reader.get_header();
        if tile_format(header.tile_type).is_none() {
            return Err(fail(format!("unsupported tile type {:?}", header.tile_type)));
        }
        if !matches!(header.tile_compression, Compression::None | Compression::Gzip | Compression::Unknown) {
            return Err(fail(format!(
                "unsupported tile compression {:?}",
                header.tile_compression
            )));
        }
        Ok(Pmtiles { name, path, reader })
    }

    fn error(&self, detail: impl ToString) -> SphereError {
        SphereError::Pmtiles { path: self.path.clone(), detail: detail.to_string() }
    }

    pub fn get_metadata(&self) -> Result<String> {
        let header = self.reader.get_header();
        let mut tj = Tilejson3::new();
        tj.set_zoom(i32::from(header.min_zoom), i32::from(header.max_zoom));
        tj.set_bounds(vec![
            header.min_longitude as f32,
            header.min_latitude as f32,
            header.max_longitude as f32,
            header.max_latitude as f32,
        ]);
        tj.set_center(vec![
            header.center_longitude as f32,
            header.center_latitude as f32,
            f32::from(header.center_zoom),
        ]);
        if let Some(format) = tile_format(header.tile_type) {
            tj.set_format(format.to_string());
        }
        tj.add_tile(sphere_url(&self.name));
        let base = tj.as_json();

        let mut result = base.clone();
        if header.metadata_length() > 0 {
            let raw = self.reader.get_metadata().map_err(|e| self.error(e))?;
            let metadata: Value = serde_json::from_str(&raw).map_err(|e| self.error(e))?;
            if metadata.is_object() {
                mbtiles::merge::merge(&mut result, metadata);
            }
        }
        if let (Some(result), Some(base)) = (result.as_object_mut(), base.as_object()) {
            for key in HEADER_KEYS {
                if let Some(value) = base.get(key) {
                    result.insert(key.to_string(), value.clone());
                }
            }
        }
        serde_json::to_string(&result).map_err(|e| self.error(e))
    }

    pub fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        let z = u8::try_from(tile.zoom).map_err(|e| self.error(e))?;
        let x = u32::try_from(tile.x).map_err(|e| self.error(e))?;
        let y = u32::try_from(tile.y).map_err(|e| self.error(e))?;
        let coord = TileCoord::new(z, x, y).map_err(|e| self.error(e))?;
        // Unknown compression is served as stored, like pmtiles-js does.
        let bytes = if self.reader.get_header().tile_compression == Compression::Unknown {
            self.reader.get_tile(coord)
        } else {
            self.reader.get_tile_decompressed(coord)
        }
        .map_err(|e| self.error(e))?;
        Ok(bytes.map(|b| b.to_vec()).unwrap_or_default())
    }
}

#[cfg(test)]
pub(crate) mod test_support {
    use super::*;
    use ::pmtiles::PmTilesWriter;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static COUNTER: AtomicUsize = AtomicUsize::new(0);

    pub(crate) struct TempArchive {
        pub(crate) path: String,
    }

    impl TempArchive {
        pub(crate) fn new() -> TempArchive {
            TempArchive::with_extension("pmtiles")
        }

        /// The extension is part of the path, so a test can use `PMTILES` to check case handling.
        pub(crate) fn with_extension(extension: &str) -> TempArchive {
            let n = COUNTER.fetch_add(1, Ordering::SeqCst);
            let path = std::env::temp_dir()
                .join(format!("sphere-pmtiles-{}-{}.{}", std::process::id(), n, extension))
                .to_string_lossy()
                .into_owned();
            TempArchive { path }
        }
    }

    impl Drop for TempArchive {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.path);
        }
    }

    pub(crate) fn write_archive(
        tile_type: TileType,
        compression: Compression,
        metadata: Option<&str>,
        tiles: &[((u8, u32, u32), &[u8])],
    ) -> TempArchive {
        write_archive_to(TempArchive::new(), tile_type, compression, metadata, tiles)
    }

    pub(crate) fn write_archive_to(
        archive: TempArchive,
        tile_type: TileType,
        compression: Compression,
        metadata: Option<&str>,
        tiles: &[((u8, u32, u32), &[u8])],
    ) -> TempArchive {
        let mut builder = PmTilesWriter::new(tile_type)
            .tile_compression(compression)
            .min_zoom(0)
            .max_zoom(2)
            .bounds(10.0, 20.0, 30.0, 40.0)
            .center(20.0, 30.0)
            .center_zoom(1);
        if let Some(m) = metadata {
            builder = builder.metadata(m);
        }
        let file = File::create(&archive.path).expect("create archive");
        let mut writer = builder.create(file).expect("writer");
        for ((z, x, y), data) in tiles {
            writer
                .add_tile(TileCoord::new(*z, *x, *y).expect("coord"), data)
                .expect("add tile");
        }
        writer.finalize().expect("finalize");
        archive
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::{write_archive, TempArchive};
    use super::*;
    use serde_json::json;
    use std::future::Future;
    use std::pin::pin;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::task::{Context, Poll, Wake, Waker};

    /// Position of the tile compression byte in the 127-byte PMTiles v3 header.
    const TILE_COMPRESSION_OFFSET: usize = 98;

    fn open(archive: &TempArchive) -> Result<Pmtiles> {
        Pmtiles::new("basemap".to_string(), archive.path.clone())
    }

    fn meta(archive: &TempArchive) -> Value {
        let raw = open(archive).expect("open").get_metadata().expect("metadata");
        serde_json::from_str(&raw).expect("valid json")
    }

    const SPHERE_TEMPLATE: &str = "sphere://basemap/tile?z={z}&x={x}&y={y}";

    #[test]
    fn get_metadata_builds_tilejson_from_header_and_metadata() {
        let archive = write_archive(
            TileType::Mvt,
            Compression::Gzip,
            Some(r#"{"name":"Sphere Test","attribution":"© test","vector_layers":[{"id":"places","fields":{}}]}"#),
            &[],
        );

        let json = meta(&archive);

        assert_eq!(json["name"], json!("Sphere Test"));
        assert_eq!(json["attribution"], json!("© test"));
        assert_eq!(json["format"], json!("pbf"));
        assert_eq!(json["minzoom"], json!(0));
        assert_eq!(json["maxzoom"], json!(2));
        assert_eq!(json["bounds"], json!([10.0, 20.0, 30.0, 40.0]));
        assert_eq!(json["center"], json!([20.0, 30.0, 1.0]));
        assert_eq!(json["tiles"][0], json!(SPHERE_TEMPLATE));
        assert_eq!(json["vector_layers"][0]["id"], json!("places"));
    }

    #[test]
    fn header_keys_win_over_metadata() {
        let archive = write_archive(
            TileType::Mvt,
            Compression::Gzip,
            Some(r#"{"tiles":["https://evil/{z}/{x}/{y}"],"format":"png","minzoom":5,"maxzoom":9,"bounds":[0,0,1,1],"center":[0,0,9],"scheme":"tms"}"#),
            &[],
        );

        let json = meta(&archive);

        assert_eq!(json["tiles"][0], json!(SPHERE_TEMPLATE));
        assert_eq!(json["tiles"].as_array().map(Vec::len), Some(1));
        assert_eq!(json["format"], json!("pbf"));
        assert_eq!(json["minzoom"], json!(0));
        assert_eq!(json["maxzoom"], json!(2));
        assert_eq!(json["bounds"], json!([10.0, 20.0, 30.0, 40.0]));
        assert_eq!(json["center"], json!([20.0, 30.0, 1.0]));
        assert_eq!(json["scheme"], json!("xyz"));
    }

    #[test]
    fn get_metadata_without_metadata_has_header_fields() {
        let archive = write_archive(TileType::Mvt, Compression::Gzip, None, &[]);

        let json = meta(&archive);

        assert_eq!(json["format"], json!("pbf"));
        assert_eq!(json["tiles"][0], json!(SPHERE_TEMPLATE));
        assert_eq!(json["vector_layers"], json!([]));
    }

    #[test]
    fn get_metadata_ignores_metadata_that_is_not_an_object() {
        let archive = write_archive(TileType::Mvt, Compression::Gzip, Some("[1,2]"), &[]);

        let json = meta(&archive);

        assert_eq!(json["format"], json!("pbf"));
    }

    #[test]
    fn get_metadata_rejects_invalid_json() {
        let archive = write_archive(TileType::Mvt, Compression::Gzip, Some("{not json"), &[]);

        let err = open(&archive).expect("open").get_metadata().expect_err("invalid json");

        assert!(matches!(err, SphereError::Pmtiles { .. }), "got: {err:?}");
    }

    #[test]
    fn raster_tile_types_map_to_formats() {
        for (tile_type, format) in [
            (TileType::Png, "png"),
            (TileType::Jpeg, "jpg"),
            (TileType::Webp, "webp"),
        ] {
            let archive = write_archive(tile_type, Compression::None, None, &[]);

            assert_eq!(meta(&archive)["format"], json!(format));
        }
    }

    #[test]
    fn new_rejects_unsupported_tile_types() {
        for tile_type in [TileType::Avif, TileType::Mlt, TileType::Unknown] {
            let archive = write_archive(tile_type, Compression::None, None, &[]);

            let err = open(&archive).expect_err("unsupported tile type");

            match err {
                SphereError::Pmtiles { path, .. } => assert_eq!(path, archive.path),
                other => panic!("expected a Pmtiles error, got {other:?}"),
            }
        }
    }

    #[test]
    fn new_rejects_unsupported_compression() {
        for compression in [Compression::Brotli, Compression::Zstd] {
            let archive = write_archive(TileType::Mvt, compression, None, &[]);

            let err = open(&archive).expect_err("unsupported compression");

            assert!(matches!(err, SphereError::Pmtiles { .. }), "got: {err:?}");
        }
    }

    #[test]
    fn new_rejects_a_file_that_is_not_pmtiles() {
        let archive = TempArchive::new();
        std::fs::write(&archive.path, b"not a pmtiles archive").expect("write");

        let err = open(&archive).expect_err("not pmtiles");

        assert!(err.to_string().contains(&archive.path), "got: {err}");
    }

    #[test]
    fn new_reports_the_path_when_the_file_cannot_be_opened() {
        let path = "/nonexistent/sphere-test.pmtiles".to_string();

        let err = Pmtiles::new("basemap".to_string(), path.clone()).expect_err("missing file");

        match err {
            SphereError::Pmtiles { path: reported, .. } => assert_eq!(reported, path),
            other => panic!("expected a Pmtiles error, got {other:?}"),
        }
    }

    #[test]
    fn get_tile_returns_decompressed_bytes() {
        for compression in [Compression::Gzip, Compression::None] {
            let archive = write_archive(
                TileType::Mvt,
                compression,
                None,
                &[((1, 1, 0), b"sphere-test-vector-tile")],
            );

            let data = open(&archive)
                .expect("open")
                .get_tile(&Tile { zoom: 1, x: 1, y: 0 })
                .expect("tile");

            assert_eq!(data, b"sphere-test-vector-tile");
        }
    }

    #[test]
    fn get_tile_missing_tile_is_empty() {
        let archive = write_archive(
            TileType::Mvt,
            Compression::Gzip,
            None,
            &[((1, 1, 0), b"sphere-test-vector-tile")],
        );

        let data = open(&archive)
            .expect("open")
            .get_tile(&Tile { zoom: 2, x: 3, y: 3 })
            .expect("missing tile is not an error");

        assert!(data.is_empty());
    }

    #[test]
    fn get_tile_rejects_an_out_of_range_coordinate() {
        let archive = write_archive(TileType::Mvt, Compression::Gzip, None, &[]);
        let pmtiles = open(&archive).expect("open");

        assert!(pmtiles.get_tile(&Tile { zoom: 1, x: 2, y: 0 }).is_err());
        assert!(pmtiles.get_tile(&Tile { zoom: -1, x: 0, y: 0 }).is_err());
    }

    #[test]
    fn unknown_tile_compression_opens_and_serves_tiles_as_stored() {
        // The writer cannot write Unknown, so patch the header's tile compression byte.
        let archive = write_archive(
            TileType::Mvt,
            Compression::None,
            None,
            &[((1, 1, 0), b"sphere-test-vector-tile")],
        );
        let mut bytes = std::fs::read(&archive.path).expect("read");
        bytes[TILE_COMPRESSION_OFFSET] = 0;
        std::fs::write(&archive.path, bytes).expect("write");

        let data = open(&archive)
            .expect("open")
            .get_tile(&Tile { zoom: 1, x: 1, y: 0 })
            .expect("tile");

        assert_eq!(data, b"sphere-test-vector-tile");
    }

    #[test]
    fn get_tile_reads_a_leaf_directory_tile_twice() {
        let tiles: Vec<((u8, u32, u32), Vec<u8>)> = (0..96u32)
            .flat_map(|x| (0..96u32).map(move |y| ((7u8, x, y), format!("tile-{x}-{y}").into_bytes())))
            .collect();
        let refs: Vec<((u8, u32, u32), &[u8])> =
            tiles.iter().map(|(c, d)| (*c, d.as_slice())).collect();
        let archive = write_archive(TileType::Mvt, Compression::Gzip, None, &refs);
        let pmtiles = open(&archive).expect("open");
        assert!(pmtiles.reader.get_header().leaf_length() > 0, "archive has no leaf directories");
        let tile = Tile { zoom: 7, x: 40, y: 17 };

        let first = pmtiles.get_tile(&tile).expect("first read");
        let second = pmtiles.get_tile(&tile).expect("second read");

        assert_eq!(first, b"tile-40-17");
        assert_eq!(second, first);
    }

    fn block_on<F: Future>(future: F) -> F::Output {
        struct Noop;
        impl Wake for Noop {
            fn wake(self: Arc<Self>) {}
        }
        let mut future = pin!(future);
        let waker = Waker::from(Arc::new(Noop));
        let mut cx = Context::from_waker(&waker);
        match future.as_mut().poll(&mut cx) {
            Poll::Ready(output) => output,
            Poll::Pending => panic!("the cache future must complete on its first poll"),
        }
    }

    #[test]
    fn bounded_cache_keeps_the_limit_and_evicts_the_oldest() {
        let cache = BoundedCache::default();
        let fetches = AtomicUsize::new(0);
        let lookup = |offset: u64| {
            block_on(cache.get_dir_entry_or_insert(offset, TileId::new(offset).expect("id"), async {
                fetches.fetch_add(1, Ordering::SeqCst);
                Ok(Directory::default())
            }))
            .expect("lookup")
        };

        for offset in 0..=MAX_CACHED_DIRECTORIES as u64 {
            lookup(offset);
        }
        assert_eq!(cache.len(), MAX_CACHED_DIRECTORIES);
        let fetched = fetches.load(Ordering::SeqCst);

        lookup(1);
        assert_eq!(fetches.load(Ordering::SeqCst), fetched, "a hit must not fetch");
        lookup(0);
        assert_eq!(fetches.load(Ordering::SeqCst), fetched + 1, "the oldest was evicted");
    }

    #[test]
    fn bounded_cache_does_not_cache_a_failed_fetch() {
        let cache = BoundedCache::default();

        let result = block_on(cache.get_dir_entry_or_insert(7, TileId::new(7).expect("id"), async {
            Err(::pmtiles::PmtError::InvalidHeader)
        }));

        assert!(result.is_err());
        assert_eq!(cache.len(), 0);
    }
}
