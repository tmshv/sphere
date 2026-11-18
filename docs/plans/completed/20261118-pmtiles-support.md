# PMTiles Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open local `.pmtiles` archives as tile sources, served through the same `sphere://` tile pipeline as MBTiles.

**Architecture:** A new `libsphere::pmtiles` module wraps the sync `pmtiles::PmTilesReader<File>` and builds TileJSON like the MBTiles reader does. A `TileArchive` trait lets `Source` hand either archive to the existing `mbtiles_get_metadata` / `mbtiles_get_tile` commands. The frontend only learns the `.pmtiles` extension and routes it down the MBTiles path (`SourceType.MVT`).

**Tech Stack:** Rust (`pmtiles` 0.28.1, local `tilejson` and `mbtiles` crates), Tauri 2 commands, React/Redux Toolkit thunks, Vitest.

**Spec:** `docs/specs/20261118-pmtiles-support.md`

## Global Constraints

- `pmtiles = { version = "=0.28.1", default-features = false }` in `crates/libsphere/Cargo.toml`; dev-dependency in `crates/libsphere` and `src-tauri`: `pmtiles = { version = "=0.28.1", default-features = false, features = ["write"] }` (for test archives only). No other new crates.
- No binary fixtures committed: tests generate `.pmtiles` files in `std::env::temp_dir()` with `pmtiles::PmTilesWriter` and remove them afterwards.
- Supported tile compression: `None` and `Gzip` only. Supported tile types: `Mvt`→`pbf`, `Png`→`png`, `Jpeg`→`jpg`, `Webp`→`webp`; `Avif`, `Mlt` and `Unknown` fail to open.
- The tile template is `sphere://{id}/tile?z={z}&x={x}&y={y}` (reuse `sphere_url` from `crates/libsphere/src/mbtiles.rs`; make it `pub(crate)`).
- Error wording: `SphereError::Pmtiles` displays `PMTiles error in {path}: {detail}`. The `mbtiles_get_tile` error for a non-tile source is `Source is not a tile archive`.
- IPC command names `mbtiles_get_metadata` / `mbtiles_get_tile` and their signatures do not change.
- Bump `crates/libsphere` `0.13.0` → `0.14.0` once, then `cargo update -p libsphere` in `src-tauri/`. Do not bump `crates/mbtiles`.
- Rust and TS code style per `AGENTS.md`. Run `npm run format` after code changes. One-line commit messages, imperative mood.

## Review Focus

- A real-world vector archive whose metadata carries its own `tiles`, `format`, `minzoom` or `bounds` must still point MapLibre at `sphere://` and keep the header's zoom and bounds (Task 1: `header_keys_win_over_metadata`).
- An archive with no metadata at all (`metadata_length == 0`) must open and give TileJSON without `vector_layers` entries instead of failing (Task 1: `get_metadata_without_metadata_has_header_fields`).
- Panning past the data must give empty tiles, not errors that flood the log (Task 1: `get_tile_missing_tile_is_empty`).
- A `.PMTILES` file with an uppercase extension must load (Task 2: `pmtiles_extension_is_case_insensitive`; frontend lowercases already, covered by the existing `.JSON` test pattern).
- A corrupt or truncated file renamed to `.pmtiles` must fail `source_add` with a message that names the path, without panicking (Task 1: `new_rejects_a_file_that_is_not_pmtiles`).

---

### Task 1: `libsphere::pmtiles` reader

**Files:**
- Modify: `crates/libsphere/Cargo.toml` (dependency, dev-dependency, version `0.14.0`)
- Modify: `crates/libsphere/src/error.rs` (add `Pmtiles { path: String, detail: String }`)
- Modify: `crates/libsphere/src/mbtiles.rs` (`sphere_url` becomes `pub(crate)`)
- Create: `crates/libsphere/src/pmtiles.rs`
- Modify: `crates/libsphere/src/lib.rs` (`pub mod pmtiles;`)

**Interfaces:**
- Produces: `pub struct Pmtiles { pub name: String, /* path, reader private */ }` with a hand-written `Debug`; `Pmtiles::new(name: String, path: String) -> crate::error::Result<Pmtiles>`; `Pmtiles::get_metadata(&self) -> Result<String>` (serialized TileJSON); `Pmtiles::get_tile(&self, tile: &mbtiles::tile::Tile) -> Result<Vec<u8>>`. Every error is `SphereError::Pmtiles { path, detail }`.

- [ ] **Step 1: Add the dependencies and the error variant**

Add the deps from Global Constraints, bump the version to `0.14.0`, and add to `SphereError`:
`#[error("PMTiles error in {path}: {detail}")] Pmtiles { path: String, detail: String }`.
Run `cargo build` in `crates/libsphere`. Expected: builds.

- [ ] **Step 2: Write the failing tests in `crates/libsphere/src/pmtiles.rs`**

Test helper: `fn write_archive(tile_type: TileType, compression: Compression, metadata: Option<&str>, tiles: &[((u8, u32, u32), &[u8])]) -> TempArchive`, which writes with `PmTilesWriter::new(tile_type)` (with `.tile_compression(compression)` / `.metadata(..)` as given, and `.min_zoom(0).max_zoom(2).bounds(10.0, 20.0, 30.0, 40.0).center(20.0, 30.0).center_zoom(1)`). `TempArchive` owns a unique temp path (pid + atomic counter, like `TempDb` in `crates/mbtiles/src/mbtiles.rs`) and removes the file on `Drop`. If the writer cannot produce Brotli/Zstd/Avif/Mlt headers without the matching feature, write the 127-byte header bytes directly in the helper (tile_type is byte 99, tile_compression byte 98 in the v3 header).

Tests, each opened with `Pmtiles::new("basemap".into(), path)`:
- `get_metadata_builds_tilejson_from_header_and_metadata`: Mvt + Gzip, metadata `{"name":"Sphere Test","attribution":"© test","vector_layers":[{"id":"places","fields":{}}]}`. Assert `name == "Sphere Test"`, `attribution == "© test"`, `format == "pbf"`, `minzoom == 0`, `maxzoom == 2`, `bounds == [10,20,30,40]`, `center == [20,30,1]`, `tiles[0] == "sphere://basemap/tile?z={z}&x={x}&y={y}"`, `vector_layers[0].id == "places"`.
- `header_keys_win_over_metadata`: metadata `{"tiles":["https://evil/{z}/{x}/{y}"],"format":"png","minzoom":5,"maxzoom":9,"bounds":[0,0,1,1]}` on an Mvt archive. Assert `tiles[0]` is the sphere template, `format == "pbf"`, `minzoom == 0`, `maxzoom == 2`, `bounds == [10,20,30,40]`.
- `get_metadata_without_metadata_has_header_fields`: no metadata. Assert `format == "pbf"`, the sphere template, and `vector_layers` is an empty array.
- `get_metadata_ignores_metadata_that_is_not_an_object`: metadata `[1,2]` → Ok, `format == "pbf"`.
- `get_metadata_rejects_invalid_json`: metadata `{not json` → `Err(SphereError::Pmtiles { .. })`.
- `raster_tile_types_map_to_formats`: for `(Png,"png")`, `(Jpeg,"jpg")`, `(Webp,"webp")` assert `format`.
- `new_rejects_unsupported_tile_types`: `Avif`, `Mlt`, `Unknown` → `Err(SphereError::Pmtiles { path, detail })` with `path` equal to the archive path.
- `new_rejects_unsupported_compression`: Brotli and Zstd tile compression → `Err(SphereError::Pmtiles { .. })`.
- `new_rejects_a_file_that_is_not_pmtiles`: a temp file containing `b"not a pmtiles archive"` → `Err`, `to_string()` contains the path.
- `new_reports_the_path_when_the_file_cannot_be_opened`: `/nonexistent/sphere-test.pmtiles` → `SphereError::Pmtiles { path }` equal to it.
- `get_tile_returns_decompressed_bytes`: Gzip archive with tile `(1,1,0)` = `b"sphere-test-vector-tile"` → `get_tile(&Tile { zoom: 1, x: 1, y: 0 })` returns those bytes; same with `Compression::None`.
- `get_tile_missing_tile_is_empty`: `Tile { zoom: 2, x: 3, y: 3 }` absent → `Ok(vec![])`.
- `get_tile_rejects_an_out_of_range_coordinate`: `Tile { zoom: 1, x: 2, y: 0 }` and `Tile { zoom: -1, x: 0, y: 0 }` → `Err`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cargo test -p libsphere pmtiles` in `crates/libsphere`. Expected: compile errors (no `Pmtiles`).

- [ ] **Step 4: Implement `Pmtiles` in `crates/libsphere/src/pmtiles.rs`**

- `new`: `PmTilesReader::new_with_path(&path)`, then check `get_header().tile_type` with `fn tile_format(t: TileType) -> Option<&'static str>` (the table in the spec) and `tile_compression` in `{None, Gzip}`; map every failure to `SphereError::Pmtiles { path, detail }`.
- `get_metadata`: build a `tilejson::Tilejson3` from the header (`set_zoom`, `set_bounds`, `set_center` with `[lon, lat, zoom]` as `f32`, `set_format`, `add_tile(sphere_url(&self.name))`), take `as_json()` as `header`; skip reading metadata when `header.metadata_length() == 0`, else parse `reader.get_metadata()` and, if it is an object, `mbtiles::merge::merge(&mut result, metadata)` onto a clone of `header`; then copy `tiles`, `format`, `minzoom`, `maxzoom`, `bounds`, `center`, `scheme` from `header` back into `result`. Serialize with `serde_json::to_string`.
- `get_tile`: convert `Tile` fields with `u8::try_from` / `u32::try_from`, build `TileCoord::new(z, x, y)`, call `get_tile_decompressed`; `None` → `Vec::new()`, `Some(bytes)` → `bytes.to_vec()`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cargo test -p libsphere` in `crates/libsphere`. Expected: all pass, including the existing MBTiles tests.

- [ ] **Step 6: Commit**

```bash
git add crates/libsphere
git commit -m "Add PMTiles reader to libsphere"
```

### Task 2: `TileArchive` trait and `Source` wiring

**Files:**
- Create: `crates/libsphere/src/tile_archive.rs`
- Modify: `crates/libsphere/src/lib.rs` (`pub mod tile_archive;`)
- Modify: `crates/libsphere/src/source.rs`

**Interfaces:**
- Consumes: `Pmtiles` and `mbtiles::Tiles` (Task 1 and existing).
- Produces: `pub trait TileArchive { fn get_metadata(&self) -> crate::error::Result<String>; fn get_tile(&self, tile: &mbtiles::tile::Tile) -> crate::error::Result<Vec<u8>>; }` implemented for `Tiles` and `Pmtiles`; `SourceData::Pmtiles(Pmtiles)`; `Source::tile_archive(&self) -> Option<&dyn TileArchive>`; `Source::is_tile_archive(&self) -> bool`. `Source::get_mbtiles()` is removed.

- [ ] **Step 1: Write the failing tests in `crates/libsphere/src/source.rs` tests**

Generate a Mvt + Gzip archive in the temp dir (a small local helper with `PmTilesWriter`, metadata `{"name":"Sphere Test"}`, one tile at `(0,0,0)`), and build a `file://` URL from its path.
- `pmtiles_file_becomes_a_pmtiles_source`: `Source::from_url(url)` → `matches!(source.data, SourceData::Pmtiles(_))`, `source.is_tile_archive()`, and `source.tile_archive().unwrap().get_tile(&Tile { zoom: 0, x: 0, y: 0 })` returns the tile bytes.
- `pmtiles_extension_is_case_insensitive`: the same archive at a `.PMTILES` path → `SourceData::Pmtiles(_)`.
- `mbtiles_source_is_a_tile_archive`: `./assets/mbtiles/test.mbtiles` → `is_tile_archive()` and `tile_archive().unwrap().get_metadata()` is Ok.
- `vector_file_is_not_a_tile_archive`: a GeoJSON fixture under `./assets/geojson-files/` → `tile_archive().is_none()`, `!is_tile_archive()`.
- `pmtiles_source_has_no_feature_collection`: `to_feature_collection()` is `Err("Tile sources cannot be converted to FeatureCollection")`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test -p libsphere source::` in `crates/libsphere`. Expected: compile errors.

- [ ] **Step 3: Implement**

Add the trait and its two impls (delegating to the inherent methods). In `source.rs`: replace `// Pmtiles,` with `Pmtiles(Pmtiles)`; add a `"pmtiles"` arm in `create_data` calling `Pmtiles::new(id.clone(), source_path)` like the `mbtiles` arm; make `to_feature_collection` return `Err("Tile sources cannot be converted to FeatureCollection")` for `Mbtiles(_) | Pmtiles(_)`, and `get_schema` its existing message for both; replace `get_mbtiles` with `tile_archive` and add `is_tile_archive`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test` in `crates/libsphere`. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add crates/libsphere
git commit -m "Load PMTiles files as tile archive sources"
```

### Task 3: Tauri commands serve PMTiles

**Files:**
- Modify: `src-tauri/Cargo.toml` (dev-dependency), `src-tauri/Cargo.lock`
- Modify: `src-tauri/src/commands/source.rs`

**Interfaces:**
- Consumes: `Source::tile_archive`, `Source::is_tile_archive`, `SourceData::Pmtiles` (Task 2).
- Produces: `source_add` reports `source_type: "pmtiles"`; `mbtiles_get_metadata` / `mbtiles_get_tile` serve any tile archive.

- [ ] **Step 1: Update the lock file**

Run `cargo update -p libsphere` in `src-tauri/` after adding the dev-dependency. Expected: `Cargo.lock` lists `libsphere 0.14.0` and `pmtiles 0.28.1`.

- [ ] **Step 2: Write the failing tests in the `tests` module of `src-tauri/src/commands/source.rs`**

Use the module's `test_app()` and a temp-dir archive generated with `PmTilesWriter` (Mvt + Gzip, metadata `{"name":"Sphere Test","vector_layers":[{"id":"places","fields":{}}]}`, tile `(0,0,0)` = `b"sphere-test-vector-tile"`).
- `source_add_loads_a_pmtiles_file_as_a_tile_source`: `source_add("file://<path>")` → `source_type == "pmtiles"`; the stored entry's `store.is_none()`.
- `mbtiles_commands_serve_a_pmtiles_source`: after `source_add`, `mbtiles_get_metadata(id)` parses to JSON with `name == "Sphere Test"` and `tiles[0] == "sphere://<id>/tile?z={z}&x={x}&y={y}"`; `mbtiles_get_tile(id, 0, 0, 0)` returns the tile bytes; `mbtiles_get_tile(id, 2, 0, 0)` returns an empty `Vec`.
- Update `mbtiles_commands_reject_a_source_that_is_not_mbtiles` to expect `"Source is not a tile archive"`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cargo test commands::source` in `src-tauri/`. Expected: FAIL (`"pmtiles"` not reported, old error message).

- [ ] **Step 4: Implement**

`source_add`: add `SourceData::Pmtiles(_) => "pmtiles".into()` and build no feature store when `source.is_tile_archive()`. `mbtiles_get_metadata` and `mbtiles_get_tile`: go through `entry.source.tile_archive()`; keep the existing error formats, with the not-a-tile-source message of `mbtiles_get_tile` set to `Source is not a tile archive`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cargo test` in `src-tauri/`. Expected: all pass. Run `cargo clippy` in `src-tauri/`. Expected: no new warnings in the touched files.

- [ ] **Step 6: Commit**

```bash
git add src-tauri
git commit -m "Serve PMTiles through the tile commands"
```

### Task 4: Frontend opens `.pmtiles`

**Files:**
- Modify: `apps/sphere/src/store/effects/open-files.ts`, `apps/sphere/src/store/effects/open-files.test.ts`
- Modify: `apps/sphere/src/store/effects/add-file.ts`, `apps/sphere/src/store/effects/add-file.test.ts`

**Interfaces:**
- Consumes: the backend accepts `file://….pmtiles` in `source_add` (Task 3); no TS interface changes.

- [ ] **Step 1: Write the failing tests**

- In `add-file.test.ts`, next to the `.mbtiles` test: `".pmtiles ext dispatches addFromUrl with MVT type and pmtiles URL"`: `mockExtname.mockResolvedValue("pmtiles")`, `addFile("/path/to/data.pmtiles")` → `addFromUrl` called with `{ url: "file:///path/to/data.pmtiles", type: SourceType.MVT }` (same assertion shape as the `.mbtiles` test).
- `".PMTILES ext (uppercase) is treated as pmtiles"`: `mockExtname.mockResolvedValue("PMTILES")` → same dispatch with `SourceType.MVT`.
- In `open-files.test.ts`, add `"pmtiles"` to the expected dialog `extensions` list (keep the list's order: after `"mbtiles"`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- add-file open-files`. Expected: the new/updated tests FAIL.

- [ ] **Step 3: Implement**

`open-files.ts`: add `"pmtiles"` after `"mbtiles"` in `extensions`. `add-file.ts`: add `case "pmtiles":` falling into the `"mbtiles"` branch; drop the dead `// type: SourceType.Raster,` comment there.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- add-file open-files`, then `npm run format`, `npm run lint`, `npm run typecheck`. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sphere/src/store/effects
git commit -m "Open PMTiles files from the dialog and drag and drop"
```

### Task 5: Docs and full verification

**Files:**
- Modify: `README.md`, `crates/libsphere/README.md`, `AGENTS.md`, `apps/sphere/src/lib/terrain.ts` (comments only)

- [ ] **Step 1: Update the docs**

- `README.md`: the format list says "GeoJSON, Shapefile, CSV, GPX, MBTiles, and PMTiles".
- `crates/libsphere/README.md`: add a `| PMTiles | `.pmtiles` |` row to the formats table, columns aligned.
- `AGENTS.md`: project overview format list adds PMTiles; IPC rows `mbtiles_get_tile` / `mbtiles_get_metadata` say "from an MBTiles or PMTiles source" (keep the table aligned); the `terrain` note says candidates are every raster MBTiles or PMTiles source; the `libsphere` crate line mentions the PMTiles reader and `TileArchive`.
- `apps/sphere/src/lib/terrain.ts`: comments that say "MBTiles" about raster tile archives say "MBTiles or PMTiles"; no code change.

- [ ] **Step 2: Run the whole verification**

Run in order: `cargo test` in `crates/libsphere`; `cargo test` in `src-tauri/`; `npm run format`; `npm run lint`; `npm run typecheck`; `npm test`. Expected: every command succeeds.

- [ ] **Step 3: Commit**

```bash
git add README.md crates/libsphere/README.md AGENTS.md apps/sphere/src/lib/terrain.ts
git commit -m "Document PMTiles support"
```
