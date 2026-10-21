# KML Support (tier one) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a `.kml` file in Sphere and display it on the map like CSV/GPX, so it gets feature IDs, selection, the attribute table, filters, and layers.

**Architecture:** A new `libsphere::kml` module parses the file with the georust `kml` crate, flattens every `Placemark` (at any Document/Folder depth) into a GeoJSON Feature, and plugs into `SourceData` the same way `Gpx` does. The Tauri layer reports `"kml"` as the source type and adds `FormatDetails::Kml` for the info panel. The frontend treats `"kml"` as one more `SourceFormat` with its own `KmlSourcePanel`.

**Tech Stack:** Rust (`kml` 0.15, `geo`/`geo-types` 0.7, `geojson` 0.24), Tauri 2, React 18 + Mantine 5, Vitest.

**Spec:** Approved in chat for issue #18. Backlog follow-ups were filed as #260 (styles), #261 (KMZ), #262 (GroundOverlay/NetworkLink/gx:Track) and #263 (altitude). None of them are part of this plan.

## Global Constraints

- Branch: `issue-18`. Commit messages are single-line and imperative.
- `kml = { version = "0.15", default-features = false, features = ["geo-types"] }`. Do not enable `zip`, because KMZ is #261.
- Only `.kml`. No styles, no KMZ, no GroundOverlay/NetworkLink/`gx:Track`, no altitude: coordinates are emitted as 2D `[x, y]`.
- Each Placemark that has a drawable geometry becomes one Feature. Placemarks with no geometry or with a `Model` geometry are skipped and counted.
- Properties are `name`, `description`, every `ExtendedData/Data` (`name` attr → `<value>` text), and every `ExtendedData/SchemaData/SimpleData` (`name` attr → text). All values stay JSON strings. If an ExtendedData key collides with `name` or `description`, the Placemark's own `name`/`description` wins.
- Bump `crates/libsphere` from `0.10.0` to `0.11.0` exactly once, then run `cargo update -p libsphere` from `src-tauri/` (and `cargo update -p libsphere` in `crates/libsphere/` for its own lock file).
- Frontend code style: double quotes, no semicolons, 4 spaces. Components follow the sibling `GpxSourcePanel` form (`export const X: FC = () =>`). Use no `!`, `as` casts, `any`, nested ternaries, or lint suppressions.
- Run `npm run format` after frontend edits and `cargo fmt` in the touched crates after Rust edits.

## Review Focus

1. **Malformed or non-KML XML.** Loading must return an `Err` that names the path. It must never panic, because the app would crash. The test is `to_geojson_returns_an_error_for_malformed_xml` in Task 1.
2. **Uppercase extension (`Track.KML`).** Some Windows and Google Earth exports use it. The extension match must be case-insensitive. The test is `create_data_matches_extensions_case_insensitively` in Task 2.
3. **A Placemark buried in nested Folders inside a Document.** It must still be drawn. This is covered by the sample asset and by `nested_folder_placemarks_are_included` in Task 1.
4. **A file whose Placemarks have no drawable geometry.** It must load as an empty source, not as an error, and the panel must say honestly how many Placemarks were skipped. The tests are `get_bounds_is_none_when_nothing_is_drawable` in Task 1 and `shows a skipped-placemarks note…` in Task 4.
5. **MultiGeometry with mixed member types.** It must still render. Homogeneous members collapse to a `Multi*` type and mixed members become a `GeometryCollection`. The test is `multigeometry_collapses_homogeneous_members_and_keeps_mixed_as_collection` in Task 1.

---

### Task 1: `libsphere::kml` module

**Files:**
- Create: `crates/libsphere/src/kml.rs`
- Create: `crates/libsphere/assets/kml/sample.kml`
- Create: `crates/libsphere/assets/kml/empty.kml`
- Create: `crates/libsphere/assets/kml/broken.kml`
- Modify: `crates/libsphere/src/lib.rs` (add `pub mod kml;`)
- Modify: `crates/libsphere/src/error.rs` (add a variant)
- Modify: `crates/libsphere/Cargo.toml` (add the dependency and bump to `0.11.0`)

**Interfaces:**
- Produces:
  - `pub struct Kml { pub path: String }` (`#[derive(Debug)]`)
  - `pub struct KmlInfo { pub placemarks: u64, pub folders: u64, pub skipped_placemarks: u64 }` (`#[derive(Debug, Clone)]`)
  - `impl Kml { pub fn info(&self) -> Result<KmlInfo>; pub fn get_schema(&self) -> Result<SourceSchema>; pub fn to_geojson(&self) -> Result<String> }`
  - `impl Bounds for Kml`, which returns `None` both on error and when there is no geometry, with no `unwrap`
  - `SphereError::Kml { path: String, detail: String }` with the message `"KML error in {path}: {detail}"`

- [ ] **Step 1: Create branch, add dependency, bump version**

Already on branch `issue-18`. In `crates/libsphere/Cargo.toml`, set `version = "0.11.0"` and add the `kml` line from Global Constraints. Then run `cargo update -p libsphere` from `src-tauri/`.

- [ ] **Step 2: Write the fixtures**

`sample.kml` is a `<kml><Document>` that contains:
- Folder "Places" holding Placemark "Cafe": a Point at `30.1,59.9,15` (with altitude), a `<description>Nice</description>`, and `<ExtendedData><Data name="rating"><value>5</value></Data><Data name="name"><value>shadow</value></Data></ExtendedData>`
- Folder "Routes" holding Folder "Day 1" holding Placemark "Walk": a LineString `30,60 31,60 31,61`, with `<ExtendedData><SchemaData schemaUrl="#s"><SimpleData name="km">3.2</SimpleData></SchemaData></ExtendedData>`
- Placemark "Park" at Document level: a Polygon with an outer ring `29,59 32,59 32,62 29,62 29,59` and one inner ring `30,60 30.5,60 30.5,60.5 30,60.5 30,60`
- Placemark "Pair": a MultiGeometry of two Points (`30,60` and `31,61`)
- Placemark "Mixed": a MultiGeometry of a Point `30,60` and a LineString `30,60 31,61`
- Placemark "Note": a name and no geometry

`empty.kml` is a Document with a single Placemark that has no geometry. `broken.kml` is `<kml><Document><Placemark>` with no closing tags.

- [ ] **Step 3: Write the failing tests in `kml.rs` `mod tests`**

All tests run against `./assets/kml/…`, and parse the output with `geojson_str.parse::<geojson::GeoJson>()`.

```rust
#[test] fn to_geojson_emits_one_feature_per_drawable_placemark()   // 5 features
#[test] fn nested_folder_placemarks_are_included()                 // a feature with name "Walk" is a LineString
#[test] fn name_description_and_extended_data_become_properties()  // Cafe: name="Cafe", description="Nice", rating="5"; Walk: km="3.2"
#[test] fn polygon_keeps_inner_rings()                             // Park: Polygon with 2 rings
#[test] fn multigeometry_collapses_homogeneous_members_and_keeps_mixed_as_collection() // Pair: MultiPoint; Mixed: GeometryCollection
#[test] fn altitude_is_dropped()                                   // Cafe coordinates == vec![30.1, 59.9]
#[test] fn info_counts_placemarks_folders_and_skipped()            // placemarks 6, folders 3, skipped_placemarks 1
#[test] fn get_bounds_covers_every_feature()                       // Some((29.0, 59.0, 32.0, 62.0))
#[test] fn get_bounds_is_none_when_nothing_is_drawable()           // empty.kml: None; to_geojson has 0 features
#[test] fn to_geojson_returns_an_error_for_malformed_xml()          // broken.kml: Err(SphereError::Kml { path, .. }) with path ending "broken.kml"
```

Look features up by their `name` property rather than by index. The ExtendedData `name="shadow"` must not overwrite `Cafe`.

- [ ] **Step 4: Run tests to verify they fail**

Run `cargo test --manifest-path crates/libsphere/Cargo.toml kml`. Expected: compile errors, because `Kml` is not defined yet.

- [ ] **Step 5: Implement `kml.rs`**

- `fn parse(&self) -> Result<kml::Kml<f64>>` calls `KmlReader::<_, f64>::from_path(&self.path)` and then `.read()`. It maps both errors to `SphereError::Kml { path, detail: e.to_string() }`.
- `fn collect(node: kml::Kml<f64>, placemarks: &mut Vec<Placemark<f64>>, folders: &mut u64)` recurses into `Kml::KmlDocument(d).elements`, `Kml::Document { elements, .. }` and `Kml::Folder(f).elements`, adding 1 to `folders` for each Folder. It pushes `Kml::Placemark`. All other variants are ignored. `Kml` is `#[non_exhaustive]`, so keep a `_ => {}` arm.
- `fn to_geo(g: kml::types::Geometry<f64>) -> Option<geo_types::Geometry<f64>>` uses `geo_types::Geometry::try_from` for Point/LineString/LinearRing/Polygon. For `MultiGeometry`, it converts each member (skipping failures). It returns `None` if no members are left. If all members are points, lines or polygons, it builds `MultiPoint` / `MultiLineString` / `MultiPolygon` respectively, and otherwise a `GeometryCollection`. `Geometry::Element` (Model) returns `None`.
- `fn properties(p: &Placemark<f64>) -> serde_json::Map<String, Value>`: the crate leaves `ExtendedData` as a generic `kml::types::Element` tree in `p.children`. Walk `children` named `ExtendedData`. For a `Data` child, take `attrs["name"]` and the `content` of its `value` child. For a `SchemaData` child, take each `SimpleData` child's `attrs["name"]` and its `content`. Insert those first, then insert `name` and `description` so that they win collisions.
- `fn features(&self) -> Result<(Vec<Feature>, KmlInfo)>` is the single pass that `info`, `to_geojson`, `get_schema` and `get_bounds` all build on. Convert geometry with `geojson::Value::from(&geo_geometry)`.
- `get_schema` reuses `infer_source_schema(features.iter())`, as in `gpx.rs`.
- `get_bounds` takes the `BoundingRect` of a `GeometryCollection` of the converted geometries.

- [ ] **Step 6: Run tests to verify they pass**

Run `cargo test --manifest-path crates/libsphere/Cargo.toml kml`. Expected: 10 passed.

- [ ] **Step 7: Commit**

```bash
git add crates/libsphere src-tauri/Cargo.lock
git commit -m "Add KML reader to libsphere"
```

### Task 2: Wire KML into `Source` and the Tauri commands

**Files:**
- Modify: `crates/libsphere/src/source.rs`: add a `SourceData::Kml(Kml)` variant; add arms to `get_bounds`, `to_feature_collection` and `get_schema`; add a `"kml"` arm in `create_data`; lowercase `ext` before the match
- Modify: `src-tauri/src/commands/source.rs:83-91`: `SourceData::Kml(_) => "kml".into()`
- Modify: `src-tauri/src/commands/source_info.rs`: add `FormatDetails::Kml { placemarks: u64, folders: u64, skipped_placemarks: u64 }`, `InfoTarget::Kml(Kml)`, an `info_target_for` arm that copies `path`, and a `details_and_file` arm that calls `kml.info()`
- Test: `crates/libsphere/src/source.rs` `mod tests` and `src-tauri/src/commands/source_info.rs` `mod tests`

**Interfaces:**
- Consumes: `Kml`, `KmlInfo` and `Kml::info()` from Task 1
- Produces: `source_add` returns `source_type: "kml"`. `source_get_info` returns `details: { format: "kml", placemarks, folders, skipped_placemarks }`.

- [ ] **Step 1: Write failing tests**

In `source.rs` tests:
- `create_data_maps_kml_extension_to_kml_source`: call `Source::create_data` with the path `Path::new("./assets/kml/sample.kml")` and the parsed `SphereUri` of that file URL, and check that it `matches!(data, SourceData::Kml(_))`.
- `create_data_matches_extensions_case_insensitively`: pass `Path::new("/nonexistent/Sample.KML")` (`create_data` does not touch the disk) and check that it gives `SourceData::Kml(_)`.
- `kml_source_to_feature_collection_assigns_ids`: wrap the sample in `Source { data: SourceData::Kml(..), .. }`. The result has 5 features, and all ids are numeric.

In `source_info.rs` tests:
- `kml_details_serialize_counts`: `format == "kml"`, `placemarks == 6`, `skipped_placemarks == 1`
- `info_target_keeps_the_kml_path`

- [ ] **Step 2: Run tests to verify they fail**

Run `cargo test --manifest-path crates/libsphere/Cargo.toml source` and `cargo test --manifest-path src-tauri/Cargo.toml source_info`. Expected: compile errors for `SourceData::Kml` / `FormatDetails::Kml`.

- [ ] **Step 3: Implement the arms listed under Files**

- [ ] **Step 4: Run the full Rust suites**

Run `cargo test --manifest-path crates/libsphere/Cargo.toml` and `cargo test --manifest-path src-tauri/Cargo.toml` (there is no cargo workspace). Expected: all pass, with no non-exhaustive-match errors left anywhere.

- [ ] **Step 5: Commit**

```bash
git add crates/libsphere/src/source.rs src-tauri/src/commands
git commit -m "Load KML sources and report KML source info"
```

### Task 3: Frontend format plumbing

**Files:**
- Modify: `apps/sphere/src/types/index.ts:13`: add `"kml"` to `SourceFormat`
- Modify: `apps/sphere/src/lib/source-format.ts:3`: add `"kml"` to `SOURCE_FORMATS`
- Modify: `apps/sphere/src/lib/source-reader.ts`: add a `FormatDetails` union member `{ format: "kml"; placemarks: number; folders: number; skipped_placemarks: number }`
- Modify: `apps/sphere/src/store/effects/open-files.ts:11`: add `"kml"` to `extensions`
- Test: `apps/sphere/src/lib/source-format.test.ts`

Drag-and-drop needs no change. `handleDragDrop` passes every path through `addFile`, which sends non-`json`/`mbtiles` paths to `source_add`.

**Interfaces:**
- Produces: `SourceFormat` includes `"kml"`, and `FormatDetails` narrows on `format === "kml"`

- [ ] **Step 1: Add `"kml"` to the `accepts %s` table in `source-format.test.ts`**
- [ ] **Step 2: Run `npm test -w @sphere/app -- source-format` and check that it FAILS on `accepts kml`**
- [ ] **Step 3: Make the four edits listed under Files**
- [ ] **Step 4: Run `npm test -w @sphere/app -- source-format` and `npm run typecheck`. Both must PASS.**
- [ ] **Step 5: Run `npm run format`, then commit with `git commit -m "Accept KML as a source format in the frontend"`**

### Task 4: `KmlSourcePanel`

**Files:**
- Create: `apps/sphere/src/components/SourcePanel/KmlSourcePanel.tsx`
- Create: `apps/sphere/src/components/SourcePanel/KmlSourcePanel.test.tsx`
- Modify: `apps/sphere/src/components/SourcePanel/index.tsx`: add `"kml"` to `PanelKind` and a `case "kml": return <KmlSourcePanel />`
- Test: `apps/sphere/src/components/SourcePanel/index.test.ts` (`selectPanelKind`)

**Interfaces:**
- Consumes: the `FormatDetails` `kml` member from Task 3
- Produces: `export const KmlSourcePanel: FC`

- [ ] **Step 1: Write failing tests**

In `index.test.ts` `describe("selectPanelKind")`, add `routes a kml-format Geojson source to the kml panel`, built from `makeGeojsonSource("s1", { format: "kml", location: "/path/to/s1.kml" })`. It expects `"kml"`.

In `KmlSourcePanel.test.tsx`, build the store the same way as `index.test.tsx` and seed `sourceInfo: () => ({ info: { s1: { file: null, schema, details } }, stats: {} })`:
- `shows placemark and folder counts`: details `{ format: "kml", placemarks: 6, folders: 3, skipped_placemarks: 0 }`. It finds the text `"Placemarks"` with `6` and `"Folders"` with `3`, and there is no skipped note.
- `shows a skipped-placemarks note when some placemarks have no drawable geometry`: `skipped_placemarks: 1`. It finds `"1 placemark has no drawable geometry and is not shown on the map."` For `skipped_placemarks: 2`, it finds `"2 placemarks have no drawable geometry and are not shown on the map."`
- `renders nothing for non-kml details`: details `{ format: "geojson" }` renders an empty container.

- [ ] **Step 2: Run `npm test -w @sphere/app -- SourcePanel` and check that the new tests FAIL**

- [ ] **Step 3: Implement**

Mirror `GpxSourcePanel.tsx`: a `FileSection`, a `PanelSection` titled `"KML contents"` with `InfoRow`s for Placemarks / Folders / Skipped placemarks, the orange `Text size="xs"` note when `skipped_placemarks > 0`, then the Geometry (`GeometryCounts`) and Attributes sections. Build the singular/plural note with an `if`, not a nested ternary. Register it in `index.tsx`.

- [ ] **Step 4: Run `npm test`, `npm run typecheck` and `npm run lint`. All must PASS.**

- [ ] **Step 5: Run `npm run format`, then commit with `git commit -m "Add KML source panel"`**

### Task 5: Docs and end-to-end check

**Files:**
- Modify: `AGENTS.md` (formerly `CLAUDE.md`): in Project Overview, change "GeoJSON, Shapefile, CSV, GPX, and MBTiles" to include KML
- Modify: `docs/plans/20261021-kml-support.md`: move it to `docs/plans/completed/` when done

- [ ] **Step 1: Update `AGENTS.md`**
- [ ] **Step 2: Run `npm run tauri dev`, open `crates/libsphere/assets/kml/sample.kml` from the dialog, and drop it onto the window.** Check that 5 features render, "Cafe" shows `rating: 5` in the attribute table, the KML panel shows Placemarks 6 / Folders 3 / Skipped 1 with the note, and zoom-to-source fits the data.
- [ ] **Step 3: Move this plan to `docs/plans/completed/` and commit with `git commit -m "Document KML support"`**
