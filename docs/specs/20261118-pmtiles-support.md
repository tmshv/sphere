# PMTiles support

Issue: #175

## Goal

Open a local `.pmtiles` file (PMTiles v3) the same way an `.mbtiles` file opens today: from the
Open dialog or by drag and drop, as a tile source whose tiles MapLibre reads through the
`sphere://` protocol. Vector archives become MVT sources with their source-layers, raster archives
become raster tile sources (and terrain candidates, like raster MBTiles).

## Approach

PMTiles is read by the native Rust crate [`pmtiles`](https://crates.io/crates/pmtiles)
(stadiamaps/pmtiles-rs), pinned to `=0.28.1` with `default-features = false`. Its synchronous
`PmTilesReader<File>` (positioned reads, no async runtime) lets PMTiles mirror the MBTiles reader
exactly: the archive is opened once when the source is added and every tile and metadata request
is served synchronously from that reader. With default features off the crate pulls in no tokio,
mmap or HTTP stack; gzip is built in.

The frontend already talks to tile sources only through the source id: `sphere://{id}/tilejson`
and `sphere://{id}/tile?z=&x=&y=`, routed by `SphereProtocol` to `MbtilesReader`, which invokes
`mbtiles_get_metadata` / `mbtiles_get_tile`. Those two commands become format-agnostic on the
backend, so no frontend reader, protocol, slice or component changes. A PMTiles source is added
with `SourceType.MVT` exactly like MBTiles and is indistinguishable from it on the frontend.

## Backend

### `libsphere::pmtiles` (new, `crates/libsphere/src/pmtiles.rs`)

`pub struct Pmtiles { pub name: String, path: String, reader: PmTilesReader<File> }`, with a
hand-written `Debug` (the reader has none) that prints `name` and `path`.

- `Pmtiles::new(name, path) -> Result<Pmtiles>` opens the archive and validates the header.
  It fails, as `SphereError::Pmtiles { path, detail }`, when the file cannot be opened or is not a
  valid PMTiles v3 archive, when the tile type has no TileJSON format (see below), or when the tile
  compression is not `None`/`Gzip` (Brotli and Zstd need extra C dependencies and are out of
  scope). Failing at open time surfaces the problem once, instead of on every tile.
- `get_metadata() -> Result<String>` returns serialized TileJSON 3.0.0, built like the MBTiles one:
  1. From the header, with the local `tilejson::Tilejson3`: `tiles` = the `sphere://{name}/tile?z={z}&x={x}&y={y}`
     template (the same `sphere_url` as MBTiles), `minzoom`/`maxzoom`, `bounds` =
     `[min_lon, min_lat, max_lon, max_lat]`, `center` = `[lon, lat, zoom]`, `format` from the tile type.
  2. The archive's JSON metadata is merged over it with `mbtiles::merge::merge` (it carries `name`,
     `description`, `attribution`, `vector_layers`, …). Empty metadata (`metadata_length == 0`) or a
     JSON value that is not an object merges nothing. Metadata that is not valid JSON is an error,
     as in MBTiles.
  3. The header-derived keys (`tiles`, `format`, `minzoom`, `maxzoom`, `bounds`, `center`, `scheme`)
     are written again after the merge: the header is authoritative for them, and a stray `tiles`
     or `format` key in the metadata must not point MapLibre elsewhere.
- `get_tile(&Tile) -> Result<Vec<u8>>` takes the existing `mbtiles::tile::Tile` (XYZ, like PMTiles)
  and returns the tile decompressed (`get_tile_decompressed`). A tile absent from the archive is an
  empty `Vec`, which the frontend already serves to MapLibre as "no data". A coordinate outside the
  zoom's range is an error.

Tile type → TileJSON `format`:

| PMTiles `TileType` | `format`         |
|--------------------|------------------|
| `Mvt`              | `pbf`            |
| `Png`              | `png`            |
| `Jpeg`             | `jpg`            |
| `Webp`             | `webp`           |
| `Avif`             | unsupported      |
| `Mlt`              | unsupported      |
| `Unknown`          | unsupported      |

`jpg` matches the MBTiles normalization and the frontend's `RASTER_TILE_FORMATS`. AVIF and MLT
are not in the frontend `TileJSON["format"]` union, so they are rejected at open time rather
than misread as vector tiles.

`SphereError` gets a `Pmtiles { path, detail }` variant, worded like `Mbtiles`
(`"PMTiles error in {path}: {detail}"`).

### `libsphere::tile_archive` (new)

`pub trait TileArchive { fn get_metadata(&self) -> Result<String>; fn get_tile(&self, tile: &Tile) -> Result<Vec<u8>>; }`,
implemented for `mbtiles::Tiles` (delegating to its existing methods) and `Pmtiles`.

### `libsphere::source`

- `SourceData::Pmtiles(Pmtiles)` replaces the `// Pmtiles,` placeholder.
- `create_data` maps the `pmtiles` extension to `Pmtiles::new(id, path)`, the same as `mbtiles`.
- `to_feature_collection` and `get_schema` reject PMTiles with the same messages as MBTiles,
  worded for tile archives (`"Tile sources cannot be converted to FeatureCollection"`).
- `Source::get_mbtiles()` is replaced by `Source::tile_archive() -> Option<&dyn TileArchive>`
  (`Some` for MBTiles and PMTiles), and `Source::is_tile_archive() -> bool`.
- `Bounds` stays `None` for both; the frontend fits to the TileJSON `bounds`.

### `src-tauri` commands

- `source_add`: `source_type` is `"pmtiles"` for a PMTiles source; no feature store is built for
  either tile archive (`is_tile_archive()`).
- `mbtiles_get_metadata` and `mbtiles_get_tile` keep their names and signatures (the frontend and
  its tests call them) but serve any tile archive through `tile_archive()`. The not-a-tile-source
  error of `mbtiles_get_tile` becomes `"Source is not a tile archive"`.
- `source_get_info` needs no change: its `_` arm already gives tile sources no file to read.

## Frontend

- `store/effects/open-files.ts`: the Open dialog offers `pmtiles`.
- `store/effects/add-file.ts`: `pmtiles` takes the `mbtiles` branch (`addFromUrl` with
  `SourceType.MVT`). Drag and drop goes through `addFile`, so it is covered.
- Nothing else: `addFromUrl`, `zoom-to`, `SphereProtocol`, `SphereSource`, preview, terrain
  candidates (`selectTerrainCandidates` takes every raster MVT source) and the source info panel
  already work from the TileJSON.

## Docs

`README.md` and `crates/libsphere/README.md` list PMTiles. `AGENTS.md`: the project overview
format list, the IPC table rows for `mbtiles_get_tile` / `mbtiles_get_metadata` (they serve
MBTiles and PMTiles), and the terrain note (raster MBTiles *or PMTiles* sources are candidates).
Comments in `apps/sphere/src/lib/terrain.ts` that say "MBTiles" for raster tile archives say
"MBTiles or PMTiles".

## Versioning

`crates/libsphere` minor bump `0.13.0` → `0.14.0` with `cargo update -p libsphere` in `src-tauri/`.
`crates/mbtiles` is not modified (only its existing public `Tile` and `merge` are reused), so it is
not bumped.

## Testing

- `libsphere::pmtiles` unit tests build archives in the temp dir with the crate's own writer
  (`pmtiles` with the `write` feature as a dev-dependency), so no binary fixture is committed:
  vector archive with metadata (name, `vector_layers`) → TileJSON fields and the `sphere://` tile
  template; header keys win over conflicting metadata keys; empty metadata; invalid JSON metadata
  errors; each raster tile type maps to its format; AVIF/MLT/unknown tile types and Brotli/Zstd
  compression fail to open; gzip tiles come back decompressed; a missing tile is empty; an
  out-of-range coordinate errors; a missing file reports its path.
- `libsphere::source`: a `.pmtiles` path becomes `SourceData::Pmtiles`, and `tile_archive()` is
  `Some` for MBTiles and PMTiles and `None` for a vector file.
- `src-tauri`: `source_add` on a generated `.pmtiles` reports `source_type: "pmtiles"` and stores
  no feature store; `mbtiles_get_metadata` / `mbtiles_get_tile` serve it; the not-a-tile-archive
  error message.
- Frontend (Vitest): `add-file` routes a `.pmtiles` path to `addFromUrl` with `SourceType.MVT`;
  the Open dialog filter includes `pmtiles`.

## Out of scope

- Remote PMTiles over HTTP range requests (the crate has an `http-async` backend; a later issue).
- Brotli and Zstd tile compression, AVIF and MLT tile types.
- Renaming `mbtiles_get_*` / `MbtilesReader` to format-neutral names.
- Making a missing MBTiles tile return empty bytes instead of an error.
