use crate::{
    archive::unzip_tile,
    merge::merge,
    tile::Tile,
    tileformat::{get_tile_format, TileFormat},
};
use parking_lot::Mutex;
use rusqlite::{params, Connection, Error as RusqliteError, OpenFlags};
use serde::{Deserialize, Serialize};
use serde_json::{Error as SerdeError, Value};
use std::fmt;
use std::io::Error as IoError;
use std::result;
use std::sync::Arc;
use tilejson::{TileScheme, Tilejson3, MAXZOOM, MINZOOM};

#[derive(Debug)]
pub enum MBTilesError {
    DB(RusqliteError),
    Serialize(SerdeError),
    Decompress(IoError),
}

impl fmt::Display for MBTilesError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MBTilesError::DB(err) => write!(f, "database error: {}", err),
            MBTilesError::Serialize(err) => write!(f, "metadata is not valid JSON: {}", err),
            MBTilesError::Decompress(err) => write!(f, "cannot decompress tile: {}", err),
        }
    }
}

impl std::error::Error for MBTilesError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            MBTilesError::DB(err) => Some(err),
            MBTilesError::Serialize(err) => Some(err),
            MBTilesError::Decompress(err) => Some(err),
        }
    }
}

impl From<RusqliteError> for MBTilesError {
    fn from(err: RusqliteError) -> Self {
        MBTilesError::DB(err)
    }
}

impl From<SerdeError> for MBTilesError {
    fn from(err: SerdeError) -> Self {
        MBTilesError::Serialize(err)
    }
}

impl From<IoError> for MBTilesError {
    fn from(err: IoError) -> Self {
        MBTilesError::Decompress(err)
    }
}

pub type Result<T> = result::Result<T, MBTilesError>;

#[derive(Serialize, Deserialize, Debug)]
pub struct MBTilesMetadata {
    pub format: Option<String>,
    pub json: Option<Value>,
    pub mbtiles_type: Option<String>,
}

/// A read-only MBTiles reader.
///
/// The SQLite connection is opened once and reused for every tile and metadata
/// request; panning a map issues hundreds of tile requests, and re-opening the
/// database for each one is pure overhead. `Connection` is `Send` but not
/// `Sync`, so it lives behind a mutex.
#[derive(Debug, Clone)]
pub struct MBTiles {
    pub source: String,
    pub path: String,
    conn: Arc<Mutex<Connection>>,
}

impl MBTiles {
    /// Opens `path` read-only, so a missing file is an error instead of a new
    /// empty database. `NO_MUTEX` is safe because the mutex above already
    /// serializes access; it matches the flags `Connection::open` uses.
    pub fn open(source: String, path: String) -> Result<MBTiles> {
        let conn = Connection::open_with_flags(
            path.as_str(),
            OpenFlags::SQLITE_OPEN_READ_ONLY
                | OpenFlags::SQLITE_OPEN_NO_MUTEX
                | OpenFlags::SQLITE_OPEN_URI,
        )?;
        Ok(MBTiles {
            source,
            path,
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn get_tilejson(&self) -> Result<Value> {
        let conn = self.conn.lock();
        let mut statement = conn.prepare_cached(
            r#"
            SELECT name, value
            FROM metadata
            WHERE value IS NOT NULL
            "#,
        )?;
        let mut meta = MBTilesMetadata {
            format: None,
            json: None,
            mbtiles_type: None,
        };
        let mut tilejson = Tilejson3::new();
        let mut meta_rows = statement.query([])?;
        let mut minzoom: i32 = MINZOOM;
        let mut maxzoom: i32 = MAXZOOM;
        while let Some(row) = meta_rows.next()? {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            match key.as_ref() {
                "name" => {
                    tilejson.set_name(value);
                }
                "description" => {
                    tilejson.set_description(value);
                }
                "version" => {
                    tilejson.set_version(value);
                }
                "attribution" => {
                    tilejson.set_attribution(value);
                }
                "legend" => {
                    tilejson.set_legend(value);
                }
                "template" => {
                    tilejson.set_template(value);
                }
                "scheme" => {
                    let scheme = TileScheme::from_str(value.as_str());
                    match scheme {
                        Some(value) => {
                            tilejson.set_scheme(value);
                        }
                        None => (),
                    }
                }
                "bounds" => {
                    let bounds = value
                        .split(',')
                        .filter_map(|s| s.parse::<f32>().ok())
                        .collect::<Vec<f32>>();
                    if bounds.len() == 4 {
                        tilejson.set_bounds(bounds);
                    }
                }
                "center" => {
                    let coord = value
                        .split(',')
                        .filter_map(|s| s.parse::<f32>().ok())
                        .collect::<Vec<f32>>();
                    if coord.len() == 2 || coord.len() == 3 {
                        tilejson.set_center(coord);
                    }
                }
                "minzoom" => {
                    minzoom = match value.parse::<i32>() {
                        Ok(value) => value,
                        Err(_) => tilejson::MINZOOM,
                    }
                }
                "maxzoom" => {
                    maxzoom = match value.parse::<i32>() {
                        Ok(value) => value,
                        Err(_) => tilejson::MAXZOOM,
                    }
                }
                "type" => meta.mbtiles_type = Some(value),
                "format" => meta.format = Some(value),
                "json" => meta.json = Some(serde_json::from_str(&value)?),
                &_ => {}
            }
        }
        let normalized_format = meta.format.map(|fmt| {
            if fmt == "jpeg" { "jpg".to_string() } else { fmt }
        });
        if let Some(ref fmt) = normalized_format {
            tilejson.set_format(fmt.clone());
        }
        tilejson.set_zoom(minzoom, maxzoom);
        tilejson.add_tile(self.source.clone());

        let mut result = tilejson.as_json();
        match meta.json {
            Some(json) => {
                merge(&mut result, json);
            }
            None => (),
        };
        // Normalize format in merged result: covers format from metadata table and json blob.
        // Re-applying also prevents json metadata blob from overwriting the normalized value.
        if let Some(obj) = result.as_object_mut() {
            if let Some(serde_json::Value::String(fmt)) = obj.get("format") {
                let normalized = if fmt == "jpeg" { "jpg".to_string() } else { fmt.clone() };
                obj.insert("format".to_string(), serde_json::Value::String(normalized));
            }
        }
        Ok(result)
    }

    pub fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>> {
        let conn = self.conn.lock();
        let mut statement = conn.prepare_cached(
            r#"
            SELECT tile_data
            FROM tiles
            WHERE 1=1
            AND zoom_level = ?1
            AND tile_column = ?2
            AND tile_row = ?3
            "#,
        )?;
        let (z, x, y) = tile.as_tms();
        let tile_bytes: Vec<u8> =
            statement.query_row(params![z, x, y], |row| row.get(0))?;
        let f = get_tile_format(tile_bytes.as_slice());
        match f {
            TileFormat::Zlib => {
                let t = unzip_tile(tile_bytes, TileFormat::Zlib)?;
                Ok(t)
            }
            TileFormat::Gzip => {
                let t = unzip_tile(tile_bytes, TileFormat::Gzip)?;
                Ok(t)
            }
            _ => Ok(tile_bytes),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::fs;
    use std::io::Write;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// An .mbtiles file in the temp dir, removed when the test ends.
    struct TempDb {
        path: PathBuf,
    }

    impl TempDb {
        fn new() -> TempDb {
            let n = COUNTER.fetch_add(1, Ordering::SeqCst);
            let path = std::env::temp_dir()
                .join(format!("mbtiles-test-{}-{}.mbtiles", std::process::id(), n));
            let _ = fs::remove_file(&path);
            let conn = Connection::open(&path).expect("create temp db");
            conn.execute_batch(
                r#"
                CREATE TABLE metadata (name TEXT, value TEXT);
                CREATE TABLE tiles (
                    zoom_level INTEGER,
                    tile_column INTEGER,
                    tile_row INTEGER,
                    tile_data BLOB
                );
                "#,
            )
            .expect("create schema");
            TempDb { path }
        }

        fn path(&self) -> String {
            self.path.to_str().expect("utf-8 temp path").to_string()
        }

        fn set_metadata(&self, name: &str, value: &str) {
            let conn = Connection::open(&self.path).expect("open temp db");
            conn.execute(
                "INSERT INTO metadata (name, value) VALUES (?1, ?2)",
                params![name, value],
            )
            .expect("insert metadata");
        }

        /// Inserts a tile addressed in TMS row order, as MBTiles files store them.
        fn set_tile(&self, z: i32, x: i32, tms_y: i32, data: &[u8]) {
            let conn = Connection::open(&self.path).expect("open temp db");
            conn.execute(
                "INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?1, ?2, ?3, ?4)",
                params![z, x, tms_y, data],
            )
            .expect("insert tile");
        }
    }

    impl Drop for TempDb {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    fn open(db: &TempDb) -> MBTiles {
        MBTiles::open("sphere://test/tile?z={z}&x={x}&y={y}".to_string(), db.path())
            .expect("open mbtiles")
    }

    /// A PBF payload long enough for `get_tile_format` to sniff.
    const PBF: &[u8] = b"\x1a\x0bnot-a-real-vector-tile";

    fn gzip(data: &[u8]) -> Vec<u8> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).expect("gzip write");
        encoder.finish().expect("gzip finish")
    }

    #[test]
    fn get_tile_returns_stored_bytes() {
        let db = TempDb::new();
        // XYZ (1, 0) at zoom 1 is TMS row 1.
        db.set_tile(1, 1, 1, PBF);
        let mbtiles = open(&db);

        let tile = mbtiles
            .get_tile(&Tile { zoom: 1, x: 1, y: 0 })
            .expect("tile found");

        assert_eq!(tile, PBF);
    }

    #[test]
    fn get_tile_decompresses_gzipped_bytes() {
        let db = TempDb::new();
        db.set_tile(0, 0, 0, &gzip(PBF));
        let mbtiles = open(&db);

        let tile = mbtiles
            .get_tile(&Tile { zoom: 0, x: 0, y: 0 })
            .expect("tile found");

        assert_eq!(tile, PBF);
    }

    #[test]
    fn get_tile_reports_the_sqlite_error_for_a_missing_tile() {
        let db = TempDb::new();
        let mbtiles = open(&db);

        let err = mbtiles
            .get_tile(&Tile { zoom: 3, x: 2, y: 1 })
            .expect_err("no such tile");

        match err {
            MBTilesError::DB(source) => {
                assert_eq!(source, RusqliteError::QueryReturnedNoRows);
            }
            other => panic!("expected a DB error carrying its source, got {:?}", other),
        }
    }

    #[test]
    fn get_tilejson_reads_metadata() {
        let db = TempDb::new();
        db.set_metadata("name", "Test Tiles");
        db.set_metadata("format", "pbf");
        db.set_metadata("minzoom", "2");
        db.set_metadata("maxzoom", "9");
        let mbtiles = open(&db);

        let tilejson = mbtiles.get_tilejson().expect("tilejson");

        assert_eq!(tilejson["name"], Value::from("Test Tiles"));
        assert_eq!(tilejson["format"], Value::from("pbf"));
        assert_eq!(tilejson["minzoom"], Value::from(2));
        assert_eq!(tilejson["maxzoom"], Value::from(9));
        assert_eq!(
            tilejson["tiles"][0],
            Value::from("sphere://test/tile?z={z}&x={x}&y={y}")
        );
    }

    #[test]
    fn open_fails_for_a_missing_file_instead_of_creating_one() {
        let path = std::env::temp_dir().join(format!(
            "mbtiles-test-missing-{}-{}.mbtiles",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ));
        let path_str = path.to_str().expect("utf-8 temp path").to_string();

        let result = MBTiles::open("sphere://missing".to_string(), path_str);

        assert!(result.is_err(), "opening a missing file must fail");
        assert!(!path.exists(), "opening must not create the file");
    }

    #[cfg(unix)]
    #[test]
    fn holds_one_connection_open_across_requests() {
        // Unlinking the file leaves the already-open connection usable, so a
        // reader that still answers here cannot be re-opening the path per call.
        let db = TempDb::new();
        db.set_tile(0, 0, 0, PBF);
        let mbtiles = open(&db);
        assert_eq!(
            mbtiles.get_tile(&Tile { zoom: 0, x: 0, y: 0 }).expect("first read"),
            PBF
        );

        fs::remove_file(&db.path).expect("unlink db");

        let tile = mbtiles
            .get_tile(&Tile { zoom: 0, x: 0, y: 0 })
            .expect("second read reuses the open connection");
        assert_eq!(tile, PBF);
    }
}
