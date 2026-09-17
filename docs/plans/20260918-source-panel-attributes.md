# Source Panel Attribute Inspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single flat source panel with one panel per source format, each showing a geometry breakdown, an attribute schema with per-field value summaries, and — for CSV — a control for choosing the geometry mode and columns.

**Architecture:** The backend gains an extended `SourceSchema`, a single `source_get_info` command carrying file facts plus a serde-tagged per-format payload, and a `source_set_csv_geometry` command that re-parses a CSV in place under the same source id. The frontend gains a `SourceFormat` discriminator on `GeojsonSource`, a `sourceInfo` slice caching info and per-column stats, a listener that fills stats in progressively on a background thread, and six format panels that share only leaf presentational primitives.

**Tech Stack:** Rust (Tauri 2.9, tokio, geojson, serde), TypeScript (React 18, Redux Toolkit listener middleware, Mantine 5), Vitest, cargo test.

**Spec:** `docs/specs/20260917-source-panel-attributes.md`

## Global Constraints

- Code style: double quotes, no semicolons, 4-space indentation, trailing commas in multiline structures, Unix line endings.
- React components use `function Component({ prop }: ComponentProps) {}` syntax, not arrow functions.
- Forbidden, without exception: `any`, non-null assertions (`foo!`), `as SomeType` casts to suppress type errors, out-of-bounds index access, magic numbers and strings, nested ternaries beyond one level, `console.log`, silently swallowed errors, and lint suppression comments (`biome-ignore`, `eslint-disable`).
- Logic lives in listener middleware, not in component event handlers. Derived state lives in `createSelector`, not inline in JSX. Constants and predicates are defined once and imported.
- Never destroy user input as a side effect of an unrelated action.
- `src/types/` holds types and interfaces only — no runtime logic, no functions, no constants. Runtime helpers for a type go in `src/lib/<same-name>.ts`.
- Before modifying any file, check whether it has tests. If it has none, write them first.
- Run `npm run format` after every code modification.
- `crates/libsphere` is bumped `0.7.0` → `0.8.0` exactly once for this PR (Task 22), not per commit.
- `@sphere/ui` and `@sphere/utils` stay pinned at `0.0.0` and are never bumped.
- Commit messages are a single line, imperative mood, no body.

---

## File Structure

**Created:**

| Path                                                          | Responsibility                                      |
|---------------------------------------------------------------|-----------------------------------------------------|
| `apps/sphere/src/lib/source-format.ts`                        | `isSourceFormat` guard + format constant set        |
| `apps/sphere/src/lib/source-format.test.ts`                   | Tests for the guard                                 |
| `apps/sphere/src/store/sourceInfo/index.ts`                   | `sourceInfo` slice: info + per-column stats caches   |
| `apps/sphere/src/store/sourceInfo/index.test.ts`              | Reducer tests                                       |
| `apps/sphere/src/store/sourceInfo/selectors.ts`               | `selectCurrentSourceFields`, `selectCurrentSourceInfo` |
| `apps/sphere/src/store/sourceInfo/selectors.test.ts`          | Selector tests                                      |
| `apps/sphere/src/store/sourceInfo/applyCsvGeometry.ts`        | The `applyCsvGeometry` action creator               |
| `apps/sphere/src/store/listeners/load-source-info.ts`         | Fetches info + stats on source select               |
| `apps/sphere/src/store/listeners/load-source-info.test.ts`    | Listener tests                                      |
| `apps/sphere/src/store/listeners/apply-csv-geometry.ts`       | Applies a CSV geometry change                       |
| `apps/sphere/src/store/listeners/apply-csv-geometry.test.ts`  | Listener tests                                      |
| `apps/sphere/src/lib/csv-geometry.ts`                         | Staged-vs-applied CSV geometry rules                |
| `apps/sphere/src/lib/csv-geometry.test.ts`                    | Tests for those rules                               |
| `packages/utils/src/format.ts`                                | `formatBytes`, `formatEpoch` (+ tests, + barrel)    |
| `apps/sphere/src/components/SourcePanel/parts/PanelSection.tsx` | Titled section wrapper used by all six panels      |
| `apps/sphere/src/components/SourcePanel/parts/FileSection.tsx`  | Size + modified rows for file-backed panels        |
| `apps/sphere/src/components/SourcePanel/parts/TileJsonSection.tsx` | Shared TileJSON metadata block                   |
| `apps/sphere/src/components/SourcePanel/parts/InfoRow.tsx`    | Label → value row                                   |
| `apps/sphere/src/components/SourcePanel/parts/FieldRow.tsx`   | Field name, type badge, null count, summary slot    |
| `apps/sphere/src/components/SourcePanel/parts/NumericSummary.tsx` | Histogram + min/max/mean                        |
| `apps/sphere/src/components/SourcePanel/parts/StringSummary.tsx`  | Unique count + top values, count only           |
| `apps/sphere/src/components/SourcePanel/parts/GeometryCounts.tsx` | Geometry counts table                           |
| `apps/sphere/src/components/SourcePanel/parts/AttributeList.tsx`  | Maps fields to `FieldRow`s                      |
| `apps/sphere/src/components/SourcePanel/GeojsonSourcePanel.tsx`   | GeoJSON panel                                   |
| `apps/sphere/src/components/SourcePanel/CsvSourcePanel.tsx`       | CSV panel                                       |
| `apps/sphere/src/components/SourcePanel/CsvGeometryConfig.tsx`    | CSV geometry mode + column pickers              |
| `apps/sphere/src/components/SourcePanel/ShapefileSourcePanel.tsx` | Shapefile panel                                 |
| `apps/sphere/src/components/SourcePanel/GpxSourcePanel.tsx`       | GPX panel                                       |
| `apps/sphere/src/components/SourcePanel/VectorTilesSourcePanel.tsx` | Vector tiles panel                            |
| `apps/sphere/src/components/SourcePanel/RasterTilesSourcePanel.tsx` | Raster tiles panel                            |
| `apps/sphere/src/store/source/addFromUrl.test.ts`             | Tests written before modifying `addFromUrl.ts`      |
| `apps/sphere/src/store/source/reload.test.ts`                 | Tests written before modifying `reload.ts`         |
| `apps/sphere/src/components/SphereMap/SphereSource.test.ts`   | Tests written before modifying `SphereSource.tsx`  |
| `src-tauri/src/commands/source_info.rs`                       | `SourceInfo`, `FormatDetails`, `source_get_info`, `source_set_csv_geometry` |

**Modified:**

| Path                                                     | Change                                                    |
|----------------------------------------------------------|-----------------------------------------------------------|
| `crates/libsphere/src/schema.rs`                         | Six new `SourceSchema` fields + `Default` derive          |
| `crates/libsphere/src/geojson.rs:54`                     | Literal `SourceSchema` construction → `..Default::default()` |
| `crates/libsphere/src/geojsonseq.rs:131`                 | Same                                                       |
| `crates/libsphere/src/gpx.rs:50`                         | Same, plus GPX content counts                              |
| `crates/libsphere/src/shape.rs:93`                       | Same, plus multi-counts, sidecars, CRS                     |
| `crates/libsphere/src/csv.rs`                            | `CsvReadResult`, `read()`, `header_columns()`              |
| `src-tauri/src/commands/source.rs`                       | `top_n` param, named constants, `spawn_blocking`, test module |
| `src-tauri/src/commands/mod.rs`                          | Register `source_info` module                              |
| `src-tauri/src/main.rs`                                  | Register two new commands                                  |
| `apps/sphere/src/types/index.ts`                         | `SourceFormat`, extended `SourceMetadata` / `SourceSchema` |
| `apps/sphere/src/types/source.ts`                        | `format` + `version` on `GeojsonSource`                    |
| `apps/sphere/src/lib/source-reader.ts`                   | `getInfo`, `setCsvGeometry`, `top_n` on `getColumnStats`    |
| `apps/sphere/src/lib/source-metadata.ts`                 | New counts, null-geometry guard, single implementation      |
| `apps/sphere/src/store/source/index.ts`                  | Drop `computeGeometryMeta`, `bumpVersion` covers GeoJSON    |
| `apps/sphere/src/store/source/addFromUrl.ts`             | Read `source_type`, set `format` and `version`              |
| `apps/sphere/src/store/source/reload.ts`                 | Carry the new counts                                        |
| `apps/sphere/src/components/SphereMap/SphereSource.tsx`  | Watch `version` for GeoJSON sources too                     |
| `apps/sphere/src/components/SourcePanel/index.tsx`       | Chrome + format dispatch only                               |
| `apps/sphere/src/components/SourcePanel/index.test.ts`   | Updated for the new selector shape                          |
| `apps/sphere/src/store/index.ts`                         | Register slice + two listeners                              |
| `apps/sphere/src/store/actions.ts`                       | Export `sourceInfo` actions                                 |
| `apps/sphere/src/store/selectors.ts`                     | Export `sourceInfo` selectors                               |
| `apps/sphere/src/store/listeners/index.ts`               | Export two new listeners                                    |
| `apps/sphere/src/testutils/index.ts`                     | `makeCsvSource`, extended metadata fixtures                 |
| `packages/ui/src/index.ts`                               | Export the existing `BarChart`                              |

---

### Task 1: Extend SourceSchema with geometry counts

**Files:**
- Modify: `crates/libsphere/src/schema.rs:44-97`
- Modify: `crates/libsphere/src/geojson.rs:54`, `crates/libsphere/src/geojsonseq.rs:131`, `crates/libsphere/src/gpx.rs:50`
- Test: `crates/libsphere/src/schema.rs` (existing `mod tests`)

**Interfaces:**
- Consumes: nothing.
- Produces: `SourceSchema` with fields `columns: HashMap<String, String>`, `points_count: u32`, `multi_points_count: u32`, `lines_count: u32`, `multi_lines_count: u32`, `polygons_count: u32`, `multi_polygons_count: u32`, `collections_count: u32`, `null_geometry_count: u32`, `features_count: u32`. `SourceSchema` now derives `Default`.

The three existing `*_count` fields keep their meaning as inclusive totals. The `multi_*` fields are the subset of those totals that are `Multi-` variants.

- [ ] **Step 1: Write the failing tests**

Add to the existing `mod tests` in `crates/libsphere/src/schema.rs`:

```rust
    fn feature_with_geometry(value: geojson::Value) -> Feature {
        Feature {
            id: None,
            geometry: Some(geojson::Geometry::new(value)),
            properties: None,
            bbox: None,
            foreign_members: None,
        }
    }

    #[test]
    fn multi_counts_are_a_subset_of_the_totals() {
        let features = vec![
            feature_with_geometry(geojson::Value::Point(vec![0.0, 0.0])),
            feature_with_geometry(geojson::Value::MultiPoint(vec![vec![0.0, 0.0]])),
            feature_with_geometry(geojson::Value::LineString(vec![
                vec![0.0, 0.0],
                vec![1.0, 1.0],
            ])),
            feature_with_geometry(geojson::Value::MultiLineString(vec![vec![
                vec![0.0, 0.0],
                vec![1.0, 1.0],
            ]])),
        ];
        let schema = infer_source_schema(features.iter());

        assert_eq!(schema.points_count, 2);
        assert_eq!(schema.multi_points_count, 1);
        assert_eq!(schema.lines_count, 2);
        assert_eq!(schema.multi_lines_count, 1);
        assert_eq!(schema.polygons_count, 0);
        assert_eq!(schema.multi_polygons_count, 0);
    }

    #[test]
    fn null_geometry_and_collections_are_counted() {
        let no_geometry = Feature {
            id: None,
            geometry: None,
            properties: None,
            bbox: None,
            foreign_members: None,
        };
        let collection = feature_with_geometry(geojson::Value::GeometryCollection(vec![]));
        let features = vec![no_geometry, collection];
        let schema = infer_source_schema(features.iter());

        assert_eq!(schema.null_geometry_count, 1);
        assert_eq!(schema.collections_count, 1);
        assert_eq!(schema.features_count, 2);
    }

    #[test]
    fn features_count_includes_every_feature() {
        let features = vec![
            feature_with_geometry(geojson::Value::Point(vec![0.0, 0.0])),
            feature_with_geometry(geojson::Value::Polygon(vec![vec![
                vec![0.0, 0.0],
                vec![1.0, 0.0],
                vec![1.0, 1.0],
                vec![0.0, 0.0],
            ]])),
        ];
        let schema = infer_source_schema(features.iter());

        assert_eq!(schema.features_count, 2);
        assert_eq!(schema.polygons_count, 1);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src-tauri && cargo test -p libsphere schema::tests`
Expected: FAIL — `no field 'multi_points_count' on type 'SourceSchema'`.

- [ ] **Step 3: Extend the struct**

In `crates/libsphere/src/schema.rs`, replace the `SourceSchema` definition:

```rust
#[derive(Debug, Clone, Default, Serialize)]
pub struct SourceSchema {
    pub columns: HashMap<String, String>,
    pub points_count: u32,
    pub multi_points_count: u32,
    pub lines_count: u32,
    pub multi_lines_count: u32,
    pub polygons_count: u32,
    pub multi_polygons_count: u32,
    pub collections_count: u32,
    pub null_geometry_count: u32,
    pub features_count: u32,
}
```

- [ ] **Step 4: Count the new categories in `infer_source_schema`**

Replace the geometry match block and the struct construction:

```rust
    let mut multi_points_count: u32 = 0;
    let mut multi_lines_count: u32 = 0;
    let mut multi_polygons_count: u32 = 0;
    let mut collections_count: u32 = 0;
    let mut null_geometry_count: u32 = 0;
    let mut features_count: u32 = 0;
```

```rust
        features_count += 1;
        match &feature.geometry {
            None => null_geometry_count += 1,
            Some(geometry) => match &geometry.value {
                geojson::Value::Point(_) => points_count += 1,
                geojson::Value::MultiPoint(_) => {
                    points_count += 1;
                    multi_points_count += 1;
                }
                geojson::Value::LineString(_) => lines_count += 1,
                geojson::Value::MultiLineString(_) => {
                    lines_count += 1;
                    multi_lines_count += 1;
                }
                geojson::Value::Polygon(_) => polygons_count += 1,
                geojson::Value::MultiPolygon(_) => {
                    polygons_count += 1;
                    multi_polygons_count += 1;
                }
                geojson::Value::GeometryCollection(_) => collections_count += 1,
            },
        }
```

```rust
    SourceSchema {
        columns,
        points_count,
        multi_points_count,
        lines_count,
        multi_lines_count,
        polygons_count,
        multi_polygons_count,
        collections_count,
        null_geometry_count,
        features_count,
    }
```

- [ ] **Step 5: Fix the three literal construction sites**

`geojson.rs:54`, `geojsonseq.rs:131`, and `gpx.rs:50` each build a zeroed `SourceSchema` as a fallback. Replace each body with:

```rust
        Ok(SourceSchema {
            columns: HashMap::new(),
            ..Default::default()
        })
```

- [ ] **Step 6: Run the full crate test suite**

Run: `cd src-tauri && cargo test -p libsphere`
Expected: PASS, including the pre-existing `shape.rs` test asserting `points_count == 7342` (Task 3 touches `shape.rs`; it must still compile here — if it does not, add `..Default::default()` to its construction too).

- [ ] **Step 7: Commit**

```bash
git add crates/libsphere/src/schema.rs crates/libsphere/src/geojson.rs crates/libsphere/src/geojsonseq.rs crates/libsphere/src/gpx.rs
git commit -m "Add multi-geometry, null and total counts to SourceSchema"
```

---

### Task 2: Count CSV rows dropped for unparseable geometry

**Files:**
- Modify: `crates/libsphere/src/csv.rs:112-153`
- Test: `crates/libsphere/src/csv.rs` (existing `mod tests`)
- Create: `crates/libsphere/assets/csv/points.csv`, `crates/libsphere/assets/csv/broken.csv`

**Interfaces:**
- Consumes: nothing.
- Produces: `CsvReadResult { features: Vec<Feature>, skipped: u64 }`; `Csv::read(&self) -> Result<CsvReadResult>`; `Csv::header_columns(&self) -> Result<Vec<String>>`. `Csv::get_features` keeps its current signature and delegates to `read`.

- [ ] **Step 1: Create the fixtures**

`crates/libsphere/assets/csv/points.csv`:

```csv
name,lng,lat
alpha,10.0,20.0
beta,11.0,21.0
```

`crates/libsphere/assets/csv/broken.csv` — three rows, none with `lng`/`lat` columns:

```csv
name,longitude,latitude
alpha,10.0,20.0
beta,11.0,21.0
gamma,12.0,22.0
```

- [ ] **Step 2: Write the failing tests**

Add to `mod tests` in `crates/libsphere/src/csv.rs`:

```rust
    fn csv_at(path: &str, geometry: CsvGeometry) -> Csv {
        Csv {
            path: path.to_string(),
            geometry,
        }
    }

    #[test]
    fn read_reports_zero_skipped_when_all_rows_parse() {
        let source = csv_at(
            "./assets/csv/points.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let result = source.read().unwrap();

        assert_eq!(result.features.len(), 2);
        assert_eq!(result.skipped, 0);
    }

    #[test]
    fn read_counts_every_row_that_yields_no_geometry() {
        let source = csv_at(
            "./assets/csv/broken.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let result = source.read().unwrap();

        assert_eq!(result.features.len(), 0);
        assert_eq!(result.skipped, 3);
    }

    #[test]
    fn header_columns_returns_the_header_row_regardless_of_geometry() {
        let source = csv_at(
            "./assets/csv/broken.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );
        let columns = source.header_columns().unwrap();

        assert_eq!(columns, vec!["name", "longitude", "latitude"]);
    }

    #[test]
    fn get_features_still_returns_only_parsed_features() {
        let source = csv_at(
            "./assets/csv/points.csv",
            CsvGeometry::XY(("lng".to_string(), "lat".to_string())),
        );

        assert_eq!(source.get_features().unwrap().len(), 2);
    }
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd src-tauri && cargo test -p libsphere csv::tests`
Expected: FAIL — `no method named 'read' found for struct 'Csv'`.

- [ ] **Step 4: Implement `CsvReadResult`, `read`, and `header_columns`**

In `crates/libsphere/src/csv.rs`, replace the `get_features` implementation:

```rust
#[derive(Debug)]
pub struct CsvReadResult {
    pub features: Vec<Feature>,
    pub skipped: u64,
}

impl Csv {
    pub fn read(&self) -> Result<CsvReadResult> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let mut features = Vec::<Feature>::new();
        let mut skipped: u64 = 0;
        let mut rdr = csv::Reader::from_reader(file);
        for result in rdr.deserialize() {
            let record: JsonObject = result.map_err(|source| SphereError::Csv {
                path: self.path.clone(),
                source,
            })?;
            match self.geometry.get_value(&record) {
                Some(geom) => features.push(Feature {
                    bbox: None,
                    geometry: Some(Geometry::new(geom)),
                    id: None,
                    properties: Some(record),
                    foreign_members: None,
                }),
                None => skipped += 1,
            }
        }

        Ok(CsvReadResult { features, skipped })
    }

    pub fn header_columns(&self) -> Result<Vec<String>> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let mut rdr = csv::Reader::from_reader(file);
        let headers = rdr.headers().map_err(|source| SphereError::Csv {
            path: self.path.clone(),
            source,
        })?;
        Ok(headers.iter().map(|h| h.to_string()).collect())
    }

    pub fn get_features(&self) -> Result<Vec<Feature>> {
        Ok(self.read()?.features)
    }
```

Leave `to_geojson`, `get_schema`, and the `Bounds` impl untouched — they call `get_features` and keep working.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test -p libsphere csv::tests`
Expected: PASS — all four new tests plus the five pre-existing `CsvParams` tests.

- [ ] **Step 6: Commit**

```bash
git add crates/libsphere/src/csv.rs crates/libsphere/assets/csv
git commit -m "Count CSV rows skipped for unparseable geometry"
```

---

### Task 3: Report shapefile sidecars, CRS and multi-geometry counts

**Files:**
- Modify: `crates/libsphere/src/shape.rs:35-100`
- Test: `crates/libsphere/src/shape.rs` (existing `mod tests`)

**Interfaces:**
- Consumes: `SourceSchema` from Task 1.
- Produces: `ShapefileInfo { has_dbf: bool, has_shx: bool, has_prj: bool, has_cpg: bool, crs: Option<String> }`; `Shapefile::info(&self) -> ShapefileInfo`.

`Shapefile::get_schema` counts geometry itself rather than going through `infer_source_schema`, so it needs the multi-counts wired in by hand.

- [ ] **Step 1: Write the failing tests**

Add to `mod tests` in `crates/libsphere/src/shape.rs`, alongside the existing tests that use `./assets/shape-files/ne_10m_populated_places.shp`:

```rust
    #[test]
    fn info_detects_present_sidecars() {
        let source = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let info = source.info();

        assert!(info.has_dbf);
        assert!(info.has_shx);
    }

    #[test]
    fn info_reports_missing_sidecars_as_false() {
        let source = Shapefile {
            path: "./assets/shape-files/does_not_exist.shp".to_string(),
        };
        let info = source.info();

        assert!(!info.has_dbf);
        assert!(!info.has_shx);
        assert!(!info.has_prj);
        assert!(!info.has_cpg);
        assert_eq!(info.crs, None);
    }

    #[test]
    fn schema_reports_features_count_and_multi_counts() {
        let source = Shapefile {
            path: "./assets/shape-files/ne_10m_populated_places.shp".to_string(),
        };
        let schema = source.get_schema().unwrap();

        assert_eq!(schema.features_count, 7342);
        assert_eq!(schema.points_count, 7342);
        assert_eq!(schema.multi_points_count, 0);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src-tauri && cargo test -p libsphere shape::tests`
Expected: FAIL — `no method named 'info' found for struct 'Shapefile'`.

- [ ] **Step 3: Implement `ShapefileInfo` and `info`**

Add to `crates/libsphere/src/shape.rs`, with `use std::path::Path;` at the top:

```rust
#[derive(Debug, Clone)]
pub struct ShapefileInfo {
    pub has_dbf: bool,
    pub has_shx: bool,
    pub has_prj: bool,
    pub has_cpg: bool,
    pub crs: Option<String>,
}

impl Shapefile {
    fn sidecar_path(&self, extension: &str) -> std::path::PathBuf {
        Path::new(&self.path).with_extension(extension)
    }

    pub fn info(&self) -> ShapefileInfo {
        let prj_path = self.sidecar_path("prj");
        let crs = std::fs::read_to_string(&prj_path)
            .ok()
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());

        ShapefileInfo {
            has_dbf: self.sidecar_path("dbf").is_file(),
            has_shx: self.sidecar_path("shx").is_file(),
            has_prj: prj_path.is_file(),
            has_cpg: self.sidecar_path("cpg").is_file(),
            crs,
        }
    }
}
```

- [ ] **Step 4: Wire the new counts into `get_schema`**

`shape.rs:43-60` counts shapes in its own loop rather than going through `infer_source_schema`. Add the new counters beside the existing ones:

```rust
        let mut multi_points_count: u32 = 0;
        let mut multi_lines_count: u32 = 0;
        let mut multi_polygons_count: u32 = 0;
        let mut null_geometry_count: u32 = 0;
        let mut features_count: u32 = 0;
```

Increment `features_count` once per shape read. In the existing match over shape variants, increment the multi counter alongside the bucket total for the `Multipoint`, `MultipointM` and `MultipointZ` variants (which already map to `points_count`), and increment `null_geometry_count` for `shapefile::Shape::NullShape`. Then extend the returned struct:

```rust
        Ok(SourceSchema {
            columns,
            points_count,
            multi_points_count,
            lines_count,
            multi_lines_count,
            polygons_count,
            multi_polygons_count,
            collections_count: 0,
            null_geometry_count,
            features_count,
        })
```

`collections_count` is `0`: the shapefile format has no geometry-collection equivalent.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test -p libsphere shape::tests`
Expected: PASS, including the pre-existing `schema.points_count == 7342` assertion.

- [ ] **Step 6: Commit**

```bash
git add crates/libsphere/src/shape.rs
git commit -m "Report shapefile sidecars, CRS and multi-geometry counts"
```

---

### Task 4: Report GPX waypoint, track and route counts

**Files:**
- Modify: `crates/libsphere/src/gpx.rs`
- Test: `crates/libsphere/src/gpx.rs` (new `mod tests`)
- Create: `crates/libsphere/assets/gpx/sample.gpx`

**Interfaces:**
- Consumes: nothing.
- Produces: `GpxInfo { waypoints: u64, tracks: u64, routes: u64, track_points: u64 }`; `Gpx::info(&self) -> Result<GpxInfo>`.

- [ ] **Step 1: Create the fixture**

`crates/libsphere/assets/gpx/sample.gpx` — one waypoint, one route, one track with two segments of two points each:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="sphere-test" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="20.0" lon="10.0"><name>wp1</name></wpt>
  <rte><name>rte1</name>
    <rtept lat="20.0" lon="10.0"/>
    <rtept lat="21.0" lon="11.0"/>
  </rte>
  <trk><name>trk1</name>
    <trkseg><trkpt lat="20.0" lon="10.0"/><trkpt lat="21.0" lon="11.0"/></trkseg>
    <trkseg><trkpt lat="22.0" lon="12.0"/><trkpt lat="23.0" lon="13.0"/></trkseg>
  </trk>
</gpx>
```

- [ ] **Step 2: Write the failing test**

Add a new `mod tests` at the bottom of `crates/libsphere/src/gpx.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn info_counts_waypoints_routes_tracks_and_track_points() {
        let source = Gpx {
            path: "./assets/gpx/sample.gpx".to_string(),
        };
        let info = source.info().unwrap();

        assert_eq!(info.waypoints, 1);
        assert_eq!(info.routes, 1);
        assert_eq!(info.tracks, 1);
        assert_eq!(info.track_points, 4);
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd src-tauri && cargo test -p libsphere gpx::tests`
Expected: FAIL — `no method named 'info' found for struct 'Gpx'`.

- [ ] **Step 4: Implement `GpxInfo` and `info`**

In `crates/libsphere/src/gpx.rs`:

```rust
#[derive(Debug, Clone)]
pub struct GpxInfo {
    pub waypoints: u64,
    pub tracks: u64,
    pub routes: u64,
    pub track_points: u64,
}

impl Gpx {
    pub fn info(&self) -> Result<GpxInfo> {
        let file = File::open(self.path.as_str()).with_path(&self.path)?;
        let reader = BufReader::new(file);
        let data: gpx::Gpx = read(reader).map_err(|e| SphereError::Shape {
            path: self.path.clone(),
            detail: e.to_string(),
        })?;

        let track_points = data
            .tracks
            .iter()
            .flat_map(|track| track.segments.iter())
            .map(|segment| segment.points.len() as u64)
            .sum();

        Ok(GpxInfo {
            waypoints: data.waypoints.len() as u64,
            tracks: data.tracks.len() as u64,
            routes: data.routes.len() as u64,
            track_points,
        })
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd src-tauri && cargo test -p libsphere gpx::tests`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add crates/libsphere/src/gpx.rs crates/libsphere/assets/gpx
git commit -m "Report GPX waypoint, track and route counts"
```

---

### Task 5: Cover the existing source commands with tests

**Files:**
- Modify: `src-tauri/src/commands/source.rs` (add `mod tests` only — no behavior change)

**Interfaces:**
- Consumes: `SourceSchema` from Task 1.
- Produces: test helpers `make_storage(entries)` and `point_feature(id, x, y)` reused by Tasks 6, 7 and 8.

`src-tauri/src/commands/source.rs` has no test module. CLAUDE.md requires tests to exist before a file is modified, and Tasks 6–8 modify it. `src-tauri/src/commands/selection.rs:345` has a `mod tests` to copy the structure from. This task adds no behavior.

- [ ] **Step 1: Write tests for the existing pure helpers and command bodies**

Add at the bottom of `src-tauri/src/commands/source.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{feature::Id, Feature};

    pub fn point_feature(id: i64, x: f64, y: f64) -> Feature {
        Feature {
            id: Some(Id::Number(id.into())),
            geometry: Some(geojson::Geometry::new(geojson::Value::Point(vec![x, y]))),
            properties: None,
            bbox: None,
            foreign_members: None,
        }
    }

    #[test]
    fn histogram_with_equal_min_and_max_is_a_single_bin() {
        let bins = build_histogram(&[5.0, 5.0, 5.0], 5.0, 5.0, 10);

        assert_eq!(bins.len(), 1);
        assert_eq!(bins[0].count, 3);
    }

    #[test]
    fn histogram_splits_the_range_into_the_requested_bins() {
        let values = vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        let bins = build_histogram(&values, 0.0, 9.0, 10);

        assert_eq!(bins.len(), 10);
        assert_eq!(bins.iter().map(|b| b.count).sum::<u64>(), 10);
    }

    #[test]
    fn histogram_puts_the_maximum_value_in_the_last_bin() {
        let bins = build_histogram(&[0.0, 10.0], 0.0, 10.0, 10);

        assert_eq!(bins[0].count, 1);
        assert_eq!(bins[9].count, 1);
    }
}
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test commands::source::tests`
Expected: PASS — these describe behavior that already exists.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/source.rs
git commit -m "Add test module for source commands"
```

---

### Task 6: Make column stats configurable and genuinely async

**Files:**
- Modify: `src-tauri/src/commands/source.rs:51-67` (`build_histogram`), `:288-376` (`source_get_column_stats`)
- Test: `src-tauri/src/commands/source.rs` (`mod tests` from Task 5)

**Interfaces:**
- Consumes: the test helpers from Task 5.
- Produces: `source_get_column_stats(id: String, column: String, ids: Option<Vec<i64>>, top_n: Option<usize>) -> Result<ColumnStats, String>`; constants `HISTOGRAM_BINS: usize = 10` and `DEFAULT_TOP_VALUES: usize = 10`.

- [ ] **Step 1: Write the failing test**

Add to `mod tests`:

```rust
    #[test]
    fn default_top_values_and_histogram_bins_are_named_constants() {
        assert_eq!(HISTOGRAM_BINS, 10);
        assert_eq!(DEFAULT_TOP_VALUES, 10);
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd src-tauri && cargo test commands::source::tests`
Expected: FAIL — `cannot find value 'HISTOGRAM_BINS' in this scope`.

- [ ] **Step 3: Introduce the constants**

Near the top of `src-tauri/src/commands/source.rs`:

```rust
const HISTOGRAM_BINS: usize = 10;
const DEFAULT_TOP_VALUES: usize = 10;
```

Replace the hardcoded `10` in the `build_histogram(&numeric_values, min_val, max_val, 10)` call with `HISTOGRAM_BINS`, and `top.truncate(10)` with `top.truncate(top_n)`.

- [ ] **Step 4: Add the `top_n` parameter and move the scan off the runtime thread**

Change the signature and wrap the scan. The `Arc<FeatureStore>` is already cloned out of the mutex before any scanning, so nothing is held across the await:

```rust
#[tauri::command]
pub async fn source_get_column_stats(
    id: String,
    column: String,
    ids: Option<Vec<i64>>,
    top_n: Option<usize>,
    storage: State<'_, SourceStorage>,
) -> Result<ColumnStats, String> {
    let fs = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
        entry
            .store
            .as_ref()
            .ok_or_else(|| "No feature store for this source".to_string())?
            .clone()
    };

    let col_type = fs
        .schema()
        .columns
        .get(&column)
        .cloned()
        .ok_or_else(|| format!("Column '{}' not found in source '{}'", column, id))?;

    let top_n = top_n.unwrap_or(DEFAULT_TOP_VALUES);

    tokio::task::spawn_blocking(move || compute_column_stats(fs, column, col_type, ids, top_n))
        .await
        .map_err(|e| e.to_string())?
}
```

Move the existing body — the iterator construction, the scan loop, and the `min`/`max`/`mean`/`histogram`/`top_values` derivation — verbatim into a new synchronous `fn compute_column_stats(fs: Arc<FeatureStore>, column: String, col_type: String, ids: Option<Vec<i64>>, top_n: usize) -> Result<ColumnStats, String>`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test commands::source::tests && cargo build`
Expected: PASS and a clean build. A compile error mentioning `Send` would mean `FeatureStore` is not thread-safe; it is, because `SourceStorage` is a Tauri `State`, which requires `Send + Sync`.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/source.rs
git commit -m "Add top_n parameter and run column stats on a blocking thread"
```

---

### Task 7: Add the source_get_info command

**Files:**
- Create: `src-tauri/src/commands/source_info.rs`
- Modify: `src-tauri/src/commands/mod.rs`, `src-tauri/src/main.rs:37-50`
- Test: `src-tauri/src/commands/source_info.rs` (new `mod tests`)

**Interfaces:**
- Consumes: `Csv::header_columns` and `Csv::read` (Task 2), `Shapefile::info` (Task 3), `Gpx::info` (Task 4), extended `SourceSchema` (Task 1).
- Produces: `source_get_info(id: String, storage: State<SourceStorage>) -> Result<SourceInfo, String>`, serializing to the JSON the frontend consumes in Task 12:

```json
{
  "file": { "size_bytes": 4096, "modified": "2026-09-18T10:00:00Z" },
  "schema": { "columns": {}, "points_count": 0, "...": 0 },
  "details": { "format": "csv", "mode": "xy", "x_column": "lng", "y_column": "lat",
               "wkt_column": null, "header_columns": ["name"], "parsed_rows": 0, "skipped_rows": 3 }
}
```

- [ ] **Step 1: Write the failing test**

Create `src-tauri/src/commands/source_info.rs` with only the test module and the type declarations it references, so the test compiles against real types:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn geojson_details_serialize_with_a_format_tag_and_no_extra_fields() {
        let json = serde_json::to_value(FormatDetails::Geojson).unwrap();

        assert_eq!(json, serde_json::json!({ "format": "geojson" }));
    }

    #[test]
    fn csv_details_serialize_every_picker_field() {
        let details = FormatDetails::Csv {
            mode: CsvMode::Xy,
            wkt_column: None,
            x_column: Some("lng".to_string()),
            y_column: Some("lat".to_string()),
            header_columns: vec!["name".to_string(), "lng".to_string()],
            parsed_rows: 2,
            skipped_rows: 3,
        };
        let json = serde_json::to_value(details).unwrap();

        assert_eq!(json["format"], "csv");
        assert_eq!(json["mode"], "xy");
        assert_eq!(json["x_column"], "lng");
        assert_eq!(json["skipped_rows"], 3);
    }

    #[test]
    fn shapefile_details_serialize_sidecar_flags() {
        let details = FormatDetails::Shapefile {
            has_dbf: true,
            has_shx: true,
            has_prj: false,
            has_cpg: false,
            crs: None,
        };
        let json = serde_json::to_value(details).unwrap();

        assert_eq!(json["format"], "shapefile");
        assert_eq!(json["has_dbf"], true);
        assert_eq!(json["crs"], serde_json::Value::Null);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd src-tauri && cargo test commands::source_info`
Expected: FAIL — `cannot find type 'FormatDetails' in this scope`.

- [ ] **Step 3: Declare the types**

At the top of `src-tauri/src/commands/source_info.rs`:

```rust
use libsphere::source::SourceData;
use serde::Serialize;
use tauri::State;

use crate::state::SourceStorage;
use libsphere::schema::SourceSchema;

#[derive(Serialize, Debug, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum CsvMode {
    Xy,
    Wkt,
}

#[derive(Serialize, Debug)]
#[serde(tag = "format", rename_all = "lowercase")]
pub enum FormatDetails {
    Geojson,
    Csv {
        mode: CsvMode,
        wkt_column: Option<String>,
        x_column: Option<String>,
        y_column: Option<String>,
        header_columns: Vec<String>,
        parsed_rows: u64,
        skipped_rows: u64,
    },
    Shapefile {
        has_dbf: bool,
        has_shx: bool,
        has_prj: bool,
        has_cpg: bool,
        crs: Option<String>,
    },
    Gpx {
        waypoints: u64,
        tracks: u64,
        routes: u64,
        track_points: u64,
    },
}

#[derive(Serialize, Debug)]
pub struct FileInfo {
    pub size_bytes: u64,
    pub modified: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct SourceInfo {
    pub file: Option<FileInfo>,
    pub schema: SourceSchema,
    pub details: FormatDetails,
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test commands::source_info`
Expected: PASS — all three serialization tests.

- [ ] **Step 5: Implement the command**

Add to `src-tauri/src/commands/source_info.rs`. `file_info_for` reads size and mtime from the path; `details_for` matches on `SourceData`:

```rust
fn file_info_for(path: &str) -> Option<FileInfo> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs().to_string());
    Some(FileInfo {
        size_bytes: metadata.len(),
        modified,
    })
}

#[tauri::command]
pub async fn source_get_info(
    id: String,
    storage: State<'_, SourceStorage>,
) -> Result<SourceInfo, String> {
    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;

    let schema = match &entry.store {
        Some(fs) => fs.schema().clone(),
        None => entry.source.get_schema()?,
    };

    let (details, path) = match &entry.source.data {
        SourceData::Csv(csv) => {
            let read = csv.read().map_err(|e| e.to_string())?;
            let header_columns = csv.header_columns().map_err(|e| e.to_string())?;
            let (mode, wkt_column, x_column, y_column) = match &csv.geometry {
                libsphere::csv::CsvGeometry::Wkt(field) => {
                    (CsvMode::Wkt, Some(field.clone()), None, None)
                }
                libsphere::csv::CsvGeometry::XY((x, y)) => {
                    (CsvMode::Xy, None, Some(x.clone()), Some(y.clone()))
                }
            };
            (
                FormatDetails::Csv {
                    mode,
                    wkt_column,
                    x_column,
                    y_column,
                    header_columns,
                    parsed_rows: read.features.len() as u64,
                    skipped_rows: read.skipped,
                },
                Some(csv.path.clone()),
            )
        }
        SourceData::Shapefile(shp) => {
            let info = shp.info();
            (
                FormatDetails::Shapefile {
                    has_dbf: info.has_dbf,
                    has_shx: info.has_shx,
                    has_prj: info.has_prj,
                    has_cpg: info.has_cpg,
                    crs: info.crs,
                },
                Some(shp.path.clone()),
            )
        }
        SourceData::Gpx(gpx) => {
            let info = gpx.info().map_err(|e| e.to_string())?;
            (
                FormatDetails::Gpx {
                    waypoints: info.waypoints,
                    tracks: info.tracks,
                    routes: info.routes,
                    track_points: info.track_points,
                },
                Some(gpx.path.clone()),
            )
        }
        SourceData::Geojson(g) => (FormatDetails::Geojson, Some(g.path.clone())),
        SourceData::GeojsonSeq(g) => (FormatDetails::Geojson, Some(g.path.clone())),
        _ => (FormatDetails::Geojson, None),
    };

    let file = path.as_deref().and_then(file_info_for);

    Ok(SourceInfo {
        file,
        schema,
        details,
    })
}
```

The `CsvGeometry` variant names in the match must match `crates/libsphere/src/csv.rs:44-47` exactly — they are `WKT` and `XY` today. Use the real names; do not rename them.

- [ ] **Step 6: Register the module and the command**

In `src-tauri/src/commands/mod.rs` add `pub mod source_info;`. In `src-tauri/src/main.rs`, add `commands::source_info::source_get_info,` to the `tauri::generate_handler!` list alongside `commands::source::source_get_schema`.

- [ ] **Step 7: Build and run the suite**

Run: `cd src-tauri && cargo build && cargo test`
Expected: clean build, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/commands/source_info.rs src-tauri/src/commands/mod.rs src-tauri/src/main.rs
git commit -m "Add source_get_info command with per-format details"
```

---

### Task 8: Add the source_set_csv_geometry command

**Files:**
- Modify: `src-tauri/src/commands/source_info.rs`, `src-tauri/src/main.rs`
- Test: `src-tauri/src/commands/source_info.rs` (`mod tests`)

**Interfaces:**
- Consumes: `CsvGeometry` (`crates/libsphere/src/csv.rs`), `build_feature_store` (`src-tauri/src/commands/source.rs:46`), which must be made `pub(crate)`.
- Produces: `source_set_csv_geometry(id: String, mode: String, wkt_column: Option<String>, x_column: Option<String>, y_column: Option<String>, storage: State<SourceStorage>) -> Result<SourceSchema, String>`; `fn csv_geometry_from_params(mode, wkt_column, x_column, y_column) -> Result<CsvGeometry, String>`.

- [ ] **Step 1: Write the failing tests**

Add to `mod tests` in `src-tauri/src/commands/source_info.rs`:

```rust
    #[test]
    fn xy_mode_requires_both_columns() {
        let err = csv_geometry_from_params("xy", None, Some("lng".to_string()), None).unwrap_err();

        assert!(err.contains("x"));
        assert!(err.contains("y"));
    }

    #[test]
    fn wkt_mode_requires_a_column() {
        let err = csv_geometry_from_params("wkt", None, None, None).unwrap_err();

        assert!(err.contains("wkt"));
    }

    #[test]
    fn wkt_mode_rejects_xy_columns() {
        let err = csv_geometry_from_params(
            "wkt",
            Some("geom".to_string()),
            Some("lng".to_string()),
            Some("lat".to_string()),
        )
        .unwrap_err();

        assert!(err.contains("wkt"));
    }

    #[test]
    fn xy_mode_builds_an_xy_geometry() {
        let geometry =
            csv_geometry_from_params("xy", None, Some("lng".to_string()), Some("lat".to_string()))
                .unwrap();

        assert!(matches!(geometry, CsvGeometry::XY((x, y)) if x == "lng" && y == "lat"));
    }

    #[test]
    fn unknown_mode_is_rejected() {
        assert!(csv_geometry_from_params("h3", None, None, None).is_err());
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src-tauri && cargo test commands::source_info`
Expected: FAIL — `cannot find function 'csv_geometry_from_params' in this scope`.

- [ ] **Step 3: Implement the parameter validation**

```rust
use libsphere::csv::CsvGeometry;

fn csv_geometry_from_params(
    mode: &str,
    wkt_column: Option<String>,
    x_column: Option<String>,
    y_column: Option<String>,
) -> Result<CsvGeometry, String> {
    match mode {
        "wkt" => {
            if x_column.is_some() || y_column.is_some() {
                return Err("cannot specify both wkt and x/y geometry params".to_string());
            }
            let field = wkt_column.ok_or_else(|| "wkt mode requires a wkt column".to_string())?;
            Ok(CsvGeometry::WKT(field))
        }
        "xy" => {
            if wkt_column.is_some() {
                return Err("cannot specify both wkt and x/y geometry params".to_string());
            }
            match (x_column, y_column) {
                (Some(x), Some(y)) => Ok(CsvGeometry::XY((x, y))),
                _ => Err("xy mode requires both an x column and a y column".to_string()),
            }
        }
        other => Err(format!("unknown csv geometry mode '{}'", other)),
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test commands::source_info`
Expected: PASS — all five validation tests.

- [ ] **Step 5: Implement the command**

Change `fn build_feature_store` in `src-tauri/src/commands/source.rs:46` to `pub(crate) fn build_feature_store`, then add to `source_info.rs`:

```rust
#[tauri::command]
pub async fn source_set_csv_geometry(
    id: String,
    mode: String,
    wkt_column: Option<String>,
    x_column: Option<String>,
    y_column: Option<String>,
    storage: State<'_, SourceStorage>,
) -> Result<SourceSchema, String> {
    let geometry = csv_geometry_from_params(&mode, wkt_column, x_column, y_column)?;

    let mut store = storage.store.lock().unwrap();
    let entry = store
        .get_mut(&id)
        .ok_or_else(|| format!("Not found {}", &id))?;

    match &mut entry.source.data {
        SourceData::Csv(csv) => {
            csv.geometry = geometry;
        }
        _ => return Err(format!("Source '{}' is not a CSV source", id)),
    }

    let feature_store = crate::commands::source::build_feature_store(&entry.source)?;
    let schema = feature_store.schema().clone();
    entry.store = Some(std::sync::Arc::new(feature_store));

    Ok(schema)
}
```

- [ ] **Step 6: Register the command**

Add `commands::source_info::source_set_csv_geometry,` to the `tauri::generate_handler!` list in `src-tauri/src/main.rs`.

- [ ] **Step 7: Build and run the suite**

Run: `cd src-tauri && cargo build && cargo test`
Expected: clean build, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/commands/source_info.rs src-tauri/src/commands/source.rs src-tauri/src/main.rs
git commit -m "Add source_set_csv_geometry command"
```

---

### Task 9: Add the SourceFormat type and guard

**Files:**
- Create: `apps/sphere/src/lib/source-format.ts`, `apps/sphere/src/lib/source-format.test.ts`
- Modify: `apps/sphere/src/types/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type SourceFormat = "geojson" | "csv" | "shapefile" | "gpx"` (exported from `@/types`); `isSourceFormat(value: string): value is SourceFormat` and `DEFAULT_SOURCE_FORMAT: SourceFormat` (exported from `@/lib/source-format`).

- [ ] **Step 1: Write the failing test**

Create `apps/sphere/src/lib/source-format.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { DEFAULT_SOURCE_FORMAT, isSourceFormat } from "./source-format"

describe("isSourceFormat", () => {
    test.each(["geojson", "csv", "shapefile", "gpx"])("accepts %s", value => {
        expect(isSourceFormat(value)).toBe(true)
    })

    test.each(["mbtiles", "GeoJSON", "", "raster"])("rejects %s", value => {
        expect(isSourceFormat(value)).toBe(false)
    })

    test("default format is geojson", () => {
        expect(DEFAULT_SOURCE_FORMAT).toBe("geojson")
    })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w @sphere/app -- source-format`
Expected: FAIL — cannot resolve `./source-format`.

- [ ] **Step 3: Add the type**

In `apps/sphere/src/types/index.ts`, beneath `SourceType`:

```ts
export type SourceFormat = "geojson" | "csv" | "shapefile" | "gpx"
```

A union, not a TS enum: `src/types/` holds types only, and an enum emits runtime code.

- [ ] **Step 4: Add the runtime guard**

Create `apps/sphere/src/lib/source-format.ts`:

```ts
import type { SourceFormat } from "@/types"

const SOURCE_FORMATS = new Set<string>(["geojson", "csv", "shapefile", "gpx"])

export const DEFAULT_SOURCE_FORMAT: SourceFormat = "geojson"

export function isSourceFormat(value: string): value is SourceFormat {
    return SOURCE_FORMATS.has(value)
}
```

The `Set<string>` membership test narrows through the predicate return type, so no `as` cast is needed.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -w @sphere/app -- source-format`
Expected: PASS — 9 assertions.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add apps/sphere/src/lib/source-format.ts apps/sphere/src/lib/source-format.test.ts apps/sphere/src/types/index.ts
git commit -m "Add SourceFormat union type and guard"
```

---

### Task 10: Consolidate geometry counting and extend SourceMetadata

**Files:**
- Modify: `apps/sphere/src/types/index.ts`, `apps/sphere/src/lib/source-metadata.ts`, `apps/sphere/src/store/source/index.ts:15-29`
- Test: `apps/sphere/src/lib/source-metadata.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SourceMetadata { columns, pointsCount, multiPointsCount, linesCount, multiLinesCount, polygonsCount, multiPolygonsCount, collectionsCount, nullGeometryCount, featuresCount }`; `SourceSchema` mirroring the Rust snake_case fields; `createSourceMetadataFromFeatureCollection(fc, columns?)` as the single implementation. `computeGeometryMeta` is deleted from `store/source/index.ts`.

`computeGeometryMeta` in `store/source/index.ts` and `createSourceMetadataFromFeatureCollection` in `lib/source-metadata.ts` are the same function written twice. The latter also reads `f.geometry.type` unguarded, which throws on a feature with `"geometry": null`.

- [ ] **Step 1: Write the failing tests**

Add to `apps/sphere/src/lib/source-metadata.test.ts`:

```ts
    test("counts Multi- variants as a subset of their bucket", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
                {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "MultiPoint", coordinates: [[0, 0]] },
                },
            ],
        }
        const meta = createSourceMetadataFromFeatureCollection(fc)

        expect(meta.pointsCount).toBe(2)
        expect(meta.multiPointsCount).toBe(1)
        expect(meta.featuresCount).toBe(2)
    })

    test("does not throw on a feature with null geometry", () => {
        const fc = {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: null }],
        } as unknown as GeoJSON.FeatureCollection
        const meta = createSourceMetadataFromFeatureCollection(fc)

        expect(meta.nullGeometryCount).toBe(1)
        expect(meta.featuresCount).toBe(1)
    })

    test("passes columns through", () => {
        const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }
        const meta = createSourceMetadataFromFeatureCollection(fc, { name: "String" })

        expect(meta.columns).toEqual({ name: "String" })
    })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- source-metadata`
Expected: FAIL — `multiPointsCount` is undefined, and the null-geometry test throws `Cannot read properties of null`.

- [ ] **Step 3: Extend the types**

In `apps/sphere/src/types/index.ts`:

```ts
export type SourceMetadata = {
    columns: Record<string, string>
    pointsCount: number
    multiPointsCount: number
    linesCount: number
    multiLinesCount: number
    polygonsCount: number
    multiPolygonsCount: number
    collectionsCount: number
    nullGeometryCount: number
    featuresCount: number
}

export type SourceSchema = {
    columns: Record<string, string>
    points_count: number
    multi_points_count: number
    lines_count: number
    multi_lines_count: number
    polygons_count: number
    multi_polygons_count: number
    collections_count: number
    null_geometry_count: number
    features_count: number
}
```

- [ ] **Step 4: Rewrite the single implementation**

Replace the body of `apps/sphere/src/lib/source-metadata.ts`:

```ts
import type { SourceMetadata } from "@/types"

export function createSourceMetadataFromFeatureCollection(
    fc: GeoJSON.FeatureCollection,
    columns: Record<string, string> = {},
): SourceMetadata {
    const meta: SourceMetadata = {
        columns,
        pointsCount: 0,
        multiPointsCount: 0,
        linesCount: 0,
        multiLinesCount: 0,
        polygonsCount: 0,
        multiPolygonsCount: 0,
        collectionsCount: 0,
        nullGeometryCount: 0,
        featuresCount: 0,
    }

    for (const f of fc.features) {
        meta.featuresCount += 1
        if (!f.geometry) {
            meta.nullGeometryCount += 1
            continue
        }
        switch (f.geometry.type) {
            case "Point":
                meta.pointsCount += 1
                break
            case "MultiPoint":
                meta.pointsCount += 1
                meta.multiPointsCount += 1
                break
            case "LineString":
                meta.linesCount += 1
                break
            case "MultiLineString":
                meta.linesCount += 1
                meta.multiLinesCount += 1
                break
            case "Polygon":
                meta.polygonsCount += 1
                break
            case "MultiPolygon":
                meta.polygonsCount += 1
                meta.multiPolygonsCount += 1
                break
            case "GeometryCollection":
                meta.collectionsCount += 1
                break
            default:
                break
        }
    }

    return meta
}

export function sourceMetadataFromSchema(schema: SourceSchema): SourceMetadata {
    return {
        columns: schema.columns,
        pointsCount: schema.points_count,
        multiPointsCount: schema.multi_points_count,
        linesCount: schema.lines_count,
        multiLinesCount: schema.multi_lines_count,
        polygonsCount: schema.polygons_count,
        multiPolygonsCount: schema.multi_polygons_count,
        collectionsCount: schema.collections_count,
        nullGeometryCount: schema.null_geometry_count,
        featuresCount: schema.features_count,
    }
}
```

Add `import type { SourceSchema } from "@/types"` to the imports. `sourceMetadataFromSchema` is the single snake_case → camelCase mapping, replacing the inline object literals currently in `addFromUrl.ts:81-86` and `reload.ts:23-28`.

- [ ] **Step 5: Delete the duplicate**

Remove `computeGeometryMeta` from `apps/sphere/src/store/source/index.ts:15-29` and update every import of it to use `createSourceMetadataFromFeatureCollection` from `@/lib/source-metadata`.

Run: `rg -n "computeGeometryMeta" apps/sphere/src` — expected: no matches.

- [ ] **Step 6: Update the test fixtures**

In `apps/sphere/src/testutils/index.ts`, extend the `meta` literal in `makeGeojsonSource` with the six new fields, all `0`, and add a `format: "geojson"` field. Add a new factory:

```ts
export function makeCsvSource<T extends object>(id: string, overrides: T = {} as T) {
    return makeGeojsonSource(id, { format: "csv", location: `/path/to/${id}.csv`, ...overrides })
}
```

- [ ] **Step 7: Run the whole frontend suite**

Run: `npm test -w @sphere/app`
Expected: PASS. Tests asserting the old four-field `meta` shape (`SourcePanel/index.test.ts:107`, `:120`) must be updated to the new shape as part of this step.

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add apps/sphere/src/types/index.ts apps/sphere/src/lib/source-metadata.ts apps/sphere/src/lib/source-metadata.test.ts apps/sphere/src/store/source/index.ts apps/sphere/src/testutils/index.ts apps/sphere/src/components/SourcePanel/index.test.ts
git commit -m "Consolidate geometry counting into one metadata helper"
```

---

### Task 11: Carry format and version on GeojsonSource

**Files:**
- Create: `apps/sphere/src/store/source/addFromUrl.test.ts`, `apps/sphere/src/store/source/reload.test.ts`
- Modify: `apps/sphere/src/types/source.ts`, `apps/sphere/src/store/source/addFromUrl.ts`, `apps/sphere/src/store/source/reload.ts`, `apps/sphere/src/store/source/index.ts`

**Interfaces:**
- Consumes: `isSourceFormat`, `DEFAULT_SOURCE_FORMAT` (Task 9), `sourceMetadataFromSchema` (Task 10).
- Produces: `GeojsonSource` with `format: SourceFormat` and `version: number`; `actions.source.addGeojsonSource` accepting `{ id, name, location, meta, format }`; `bumpVersion` incrementing for both `Geojson` and `FeatureCollection` sources.

`addFromUrl.ts` and `reload.ts` have no tests. They are written first.

- [ ] **Step 1: Write the failing tests for addFromUrl**

Create `apps/sphere/src/store/source/addFromUrl.test.ts`, following the mocking pattern in `apps/sphere/src/store/listeners/save-draw.test.ts:1-40`:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, test, vi, beforeEach } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import addFromUrl from "./addFromUrl"
import { SourceType } from "@/types"

const schema = {
    columns: { name: "String" },
    points_count: 2,
    multi_points_count: 0,
    lines_count: 0,
    multi_lines_count: 0,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 2,
}

function makeStore() {
    const dispatched: { type: string; payload?: unknown }[] = []
    const store = configureStore({
        reducer: (s: Record<string, unknown> = {}) => s,
        middleware: getDefault =>
            getDefault().concat(() => next => action => {
                dispatched.push(action as { type: string })
                return next(action)
            }),
    })
    return { store, dispatched }
}

describe("addFromUrl", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
    })

    test("passes the backend source_type through as format", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "points",
                    location: "file:///data/points.csv",
                    source_type: "csv",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeStore()

        await store.dispatch(addFromUrl({ url: "file:///data/points.csv", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({ id: "s1", format: "csv" })
    })

    test("falls back to geojson for an unrecognized source_type", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "x",
                    location: "file:///x.unknown",
                    source_type: "something-new",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeStore()

        await store.dispatch(addFromUrl({ url: "file:///x.unknown", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({ format: "geojson" })
    })

    test("maps the schema counts into metadata", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "x",
                    location: "file:///x.geojson",
                    source_type: "geojson",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeStore()

        await store.dispatch(addFromUrl({ url: "file:///x.geojson", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({
            meta: { pointsCount: 2, featuresCount: 2, columns: { name: "String" } },
        })
    })
})
```

- [ ] **Step 2: Write the failing test for reload**

Create `apps/sphere/src/store/source/reload.test.ts` with the same mocking preamble, asserting that dispatching `reload("s1")` for a `SourceType.Geojson` source dispatches `source/setGeojsonMeta` whose payload `meta` carries `multiPointsCount` and `featuresCount` from the schema.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- addFromUrl reload`
Expected: FAIL — the dispatched payload has no `format` key and no `featuresCount`.

- [ ] **Step 4: Extend the source types**

In `apps/sphere/src/types/source.ts`:

```ts
export type GeojsonSource = {
    type: SourceType.Geojson
    format: SourceFormat
    meta: SourceMetadata
    location: string
    version: number
    editable: false
    pending: false
}
```

Add `SourceFormat` to the type import from `@/types`.

- [ ] **Step 5: Thread format and version through the reducer**

In `apps/sphere/src/store/source/index.ts`, `addGeojsonSource` takes `format: SourceFormat` in its payload and writes `format` and `version: 0` into the stored source. Widen `bumpVersion` so it increments for both source types:

```ts
        bumpVersion: (state, action: PayloadAction<Id>) => {
            const source = state.items[action.payload]
            if (!source) return
            if (source.type === SourceType.Geojson) {
                source.version++
                return
            }
            if (source.type === SourceType.FeatureCollection && !source.pending) {
                source.version++
            }
        },
```

- [ ] **Step 6: Read the format in addFromUrl**

In `apps/sphere/src/store/source/addFromUrl.ts`, extend the `NewSource` type with `source_type: string`, and in the `SourceType.Geojson` branch:

```ts
            case SourceType.Geojson: {
                const r = new SourceReader(id)
                const schema = await r.getSchema()
                const meta = schema ? sourceMetadataFromSchema(schema) : EMPTY_SOURCE_METADATA
                const format = isSourceFormat(s.source_type) ? s.source_type : DEFAULT_SOURCE_FORMAT
                thunkAPI.dispatch(
                    actions.addGeojsonSource({
                        id,
                        name,
                        location,
                        meta,
                        format,
                    }),
                )
                break
            }
```

Add `EMPTY_SOURCE_METADATA` to `apps/sphere/src/lib/source-metadata.ts` as the all-zero metadata constant, so the fallback is defined once.

- [ ] **Step 7: Use the shared mapping in reload**

In `apps/sphere/src/store/source/reload.ts`, replace the inline object literal with `sourceMetadataFromSchema(schema)`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -w @sphere/app && npm run typecheck`
Expected: PASS and a clean typecheck.

- [ ] **Step 9: Format and commit**

```bash
npm run format
git add apps/sphere/src/types/source.ts apps/sphere/src/store/source
git commit -m "Carry source format and version on GeojsonSource"
```

---

### Task 12: Re-fetch GeoJSON sources when version changes

**Files:**
- Create: `apps/sphere/src/components/SphereMap/SphereSource.test.ts`
- Modify: `apps/sphere/src/components/SphereMap/SphereSource.tsx:21-40`

**Interfaces:**
- Consumes: `version` on `GeojsonSource` (Task 11).
- Produces: `SphereSource` re-fetching via `source_get` whenever `version` increments, for both `Geojson` and `FeatureCollection` sources.

`SphereSource.tsx` has no tests. Without this task a CSV re-parse leaves the old geometry on the map.

- [ ] **Step 1: Read the current effect**

Read `apps/sphere/src/components/SphereMap/SphereSource.tsx:15-60` to see exactly how the `FeatureCollection` version watch is written, so the `Geojson` path reuses the same mechanism rather than inventing a second one.

- [ ] **Step 2: Write the failing test**

Create `apps/sphere/src/components/SphereMap/SphereSource.test.ts` exercising the selector and effect dependency list — extract the "which version does this source expose" logic into an exported pure helper so it is testable without mounting MapLibre:

```ts
import { makeGeojsonSource } from "@/testutils"
import type { Source } from "@/types/source"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectSourceVersion } from "./SphereSource"

const asSource = (value: ReturnType<typeof makeGeojsonSource>): Source =>
    value as unknown as Source

describe("selectSourceVersion", () => {
    test("returns the version for a Geojson source", () => {
        const source = asSource(makeGeojsonSource("s1", { version: 3 }))
        expect(selectSourceVersion(source)).toBe(3)
    })

    test("returns the version for a FeatureCollection source", () => {
        const source = asSource(
            makeGeojsonSource("s1", {
                type: SourceType.FeatureCollection,
                editable: true,
                version: 7,
            }),
        )
        expect(selectSourceVersion(source)).toBe(7)
    })

    test("returns 0 for a pending FeatureCollection source", () => {
        const source = asSource(
            makeGeojsonSource("s1", {
                type: SourceType.FeatureCollection,
                editable: true,
                pending: true,
            }),
        )
        expect(selectSourceVersion(source)).toBe(0)
    })

    test("returns 0 for a source with no version concept", () => {
        const source = asSource(makeGeojsonSource("s1", { type: SourceType.Raster }))
        expect(selectSourceVersion(source)).toBe(0)
    })
})
```

The `asSource` helper is confined to this test file, where building a complete discriminated-union member by hand for each case would bury the assertion. Production code never casts: `selectSourceVersion` takes the `Source` union and narrows with `switch` and property guards.

Implementation:

```ts
export function selectSourceVersion(source: Source): number {
    if (source.type === SourceType.Geojson) {
        return source.version
    }
    if (source.type === SourceType.FeatureCollection && !source.pending) {
        return source.version
    }
    return 0
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -w @sphere/app -- SphereSource`
Expected: FAIL — `selectSourceVersion` is not exported.

- [ ] **Step 4: Implement and wire the helper**

Export `selectSourceVersion` from `SphereSource.tsx` and add its result to the fetch effect's dependency array, so an incremented `version` re-runs `source_get` for `Geojson` sources exactly as it already does for `FeatureCollection` ones.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- SphereSource && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/SphereMap/SphereSource.tsx apps/sphere/src/components/SphereMap/SphereSource.test.ts
git commit -m "Re-fetch GeoJSON sources when their version changes"
```

---

### Task 13: Extend SourceReader with info and CSV geometry calls

**Files:**
- Modify: `apps/sphere/src/lib/source-reader.ts`
- Test: `apps/sphere/src/lib/source-reader.test.ts`

**Interfaces:**
- Consumes: `source_get_info` (Task 7), `source_set_csv_geometry` (Task 8).
- Produces: types `FileInfo`, `CsvMode`, `FormatDetails`, `SourceInfo`, `CsvGeometryParams`; methods `SourceReader.getInfo(): Promise<SourceInfo | null>`, `SourceReader.setCsvGeometry(params: CsvGeometryParams): Promise<SourceSchema>`, and `getColumnStats(column, ids?, topN?)`.

`setCsvGeometry` deliberately does **not** swallow its error — the caller needs the failure to keep the user's staged input. Every other method in this file logs and returns `null`; this one rethrows, and the difference is intentional.

- [ ] **Step 1: Write the failing tests**

Add to `apps/sphere/src/lib/source-reader.test.ts`:

```ts
describe("getInfo", () => {
    test("returns the parsed info payload", async () => {
        mockInvoke.mockResolvedValue({
            file: { size_bytes: 4096, modified: "1758153600" },
            schema: { columns: {}, points_count: 0 },
            details: { format: "geojson" },
        })
        const reader = new SourceReader("s1")

        const info = await reader.getInfo()

        expect(mockInvoke).toHaveBeenCalledWith("source_get_info", { id: "s1" })
        expect(info?.details.format).toBe("geojson")
    })

    test("returns null when the command fails", async () => {
        mockInvoke.mockRejectedValue(new Error("boom"))
        const reader = new SourceReader("s1")

        expect(await reader.getInfo()).toBeNull()
    })
})

describe("setCsvGeometry", () => {
    test("forwards the params", async () => {
        mockInvoke.mockResolvedValue({ columns: {}, points_count: 2 })
        const reader = new SourceReader("s1")

        await reader.setCsvGeometry({ mode: "xy", xColumn: "lng", yColumn: "lat" })

        expect(mockInvoke).toHaveBeenCalledWith("source_set_csv_geometry", {
            id: "s1",
            mode: "xy",
            wktColumn: null,
            xColumn: "lng",
            yColumn: "lat",
        })
    })

    test("rethrows so the caller can keep the staged input", async () => {
        mockInvoke.mockRejectedValue(new Error("xy mode requires both an x column and a y column"))
        const reader = new SourceReader("s1")

        await expect(reader.setCsvGeometry({ mode: "xy", xColumn: "lng" })).rejects.toThrow(
            "xy mode requires both",
        )
    })
})

describe("getColumnStats", () => {
    test("forwards topN when given", async () => {
        mockInvoke.mockResolvedValue({ column: "a", col_type: "String", count: 1, null_count: 0 })
        const reader = new SourceReader("s1")

        await reader.getColumnStats("a", undefined, 25)

        expect(mockInvoke).toHaveBeenCalledWith("source_get_column_stats", {
            id: "s1",
            column: "a",
            ids: undefined,
            topN: 25,
        })
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- source-reader`
Expected: FAIL — `reader.getInfo is not a function`.

- [ ] **Step 3: Add the types**

In `apps/sphere/src/lib/source-reader.ts`:

```ts
export type FileInfo = {
    size_bytes: number
    modified: string | null
}

export type CsvMode = "xy" | "wkt"

export type FormatDetails =
    | { format: "geojson" }
    | {
          format: "csv"
          mode: CsvMode
          wkt_column: string | null
          x_column: string | null
          y_column: string | null
          header_columns: string[]
          parsed_rows: number
          skipped_rows: number
      }
    | {
          format: "shapefile"
          has_dbf: boolean
          has_shx: boolean
          has_prj: boolean
          has_cpg: boolean
          crs: string | null
      }
    | {
          format: "gpx"
          waypoints: number
          tracks: number
          routes: number
          track_points: number
      }

export type SourceInfo = {
    file: FileInfo | null
    schema: SourceSchema
    details: FormatDetails
}

export type CsvGeometryParams = {
    mode: CsvMode
    wktColumn?: string
    xColumn?: string
    yColumn?: string
}
```

The `format` tag makes `FormatDetails` a discriminated union, so panels narrow on `details.format` without casts.

- [ ] **Step 4: Add the methods**

```ts
    public async getInfo(): Promise<SourceInfo | null> {
        try {
            return await invoke<SourceInfo>("source_get_info", {
                id: this.id,
            })
        } catch (error) {
            logger.error("Failed to get source info %s", error)
            return null
        }
    }

    public async setCsvGeometry(params: CsvGeometryParams): Promise<SourceSchema> {
        return await invoke<SourceSchema>("source_set_csv_geometry", {
            id: this.id,
            mode: params.mode,
            wktColumn: params.wktColumn ?? null,
            xColumn: params.xColumn ?? null,
            yColumn: params.yColumn ?? null,
        })
    }
```

Add the optional `topN` parameter to `getColumnStats` and forward it as `topN`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- source-reader && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add apps/sphere/src/lib/source-reader.ts apps/sphere/src/lib/source-reader.test.ts
git commit -m "Add getInfo and setCsvGeometry to SourceReader"
```

---

### Task 14: Add the sourceInfo slice

**Files:**
- Create: `apps/sphere/src/store/sourceInfo/index.ts`, `apps/sphere/src/store/sourceInfo/index.test.ts`
- Modify: `apps/sphere/src/store/index.ts`, `apps/sphere/src/store/actions.ts`

**Interfaces:**
- Consumes: `SourceInfo`, `ColumnStats` (Task 13).
- Produces: reducer `sourceInfo`; actions `infoRequested(id)`, `infoReceived({ id, info })`, `infoFailed(id)`, `statsRequested({ id, column })`, `statsReceived({ id, column, stats })`, `statsFailed({ id, column })`, `invalidate(id)`.

- [ ] **Step 1: Write the failing tests**

Create `apps/sphere/src/store/sourceInfo/index.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import reducer, { actions } from "./index"

const info = {
    file: { size_bytes: 10, modified: null },
    schema: { columns: { name: "String" }, points_count: 1 },
    details: { format: "geojson" as const },
}

describe("sourceInfo reducer", () => {
    test("infoRequested marks the entry pending", () => {
        const state = reducer(undefined, actions.infoRequested("s1"))
        expect(state.info.s1?.status).toBe("pending")
    })

    test("infoReceived stores the payload and marks it ready", () => {
        let state = reducer(undefined, actions.infoRequested("s1"))
        state = reducer(state, actions.infoReceived({ id: "s1", info }))
        expect(state.info.s1?.status).toBe("ready")
        expect(state.info.s1?.details).toEqual({ format: "geojson" })
    })

    test("infoFailed marks the entry errored without clearing other sources", () => {
        let state = reducer(undefined, actions.infoReceived({ id: "s1", info }))
        state = reducer(state, actions.infoFailed("s2"))
        expect(state.info.s2?.status).toBe("error")
        expect(state.info.s1?.status).toBe("ready")
    })

    test("statsReceived stores per column under its source", () => {
        const stats = { column: "name", col_type: "String", count: 5, null_count: 0 }
        const state = reducer(undefined, actions.statsReceived({ id: "s1", column: "name", stats }))
        expect(state.stats.s1?.name?.status).toBe("ready")
        expect(state.stats.s1?.name?.data).toEqual(stats)
    })

    test("statsRequested for one column leaves sibling columns untouched", () => {
        const stats = { column: "a", col_type: "String", count: 1, null_count: 0 }
        let state = reducer(undefined, actions.statsReceived({ id: "s1", column: "a", stats }))
        state = reducer(state, actions.statsRequested({ id: "s1", column: "b" }))
        expect(state.stats.s1?.a?.status).toBe("ready")
        expect(state.stats.s1?.b?.status).toBe("pending")
    })

    test("invalidate drops both caches for that source only", () => {
        let state = reducer(undefined, actions.infoReceived({ id: "s1", info }))
        state = reducer(state, actions.infoReceived({ id: "s2", info }))
        state = reducer(state, actions.statsReceived({
            id: "s1",
            column: "a",
            stats: { column: "a", col_type: "String", count: 1, null_count: 0 },
        }))
        state = reducer(state, actions.invalidate("s1"))
        expect(state.info.s1).toBeUndefined()
        expect(state.stats.s1).toBeUndefined()
        expect(state.info.s2?.status).toBe("ready")
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- sourceInfo`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement the slice**

Create `apps/sphere/src/store/sourceInfo/index.ts`:

```ts
import type { ColumnStats, FileInfo, FormatDetails, SourceInfo } from "@/lib/source-reader"
import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type LoadStatus = "pending" | "ready" | "error"

export type InfoEntry = {
    status: LoadStatus
    file?: FileInfo | null
    details?: FormatDetails
}

export type StatsEntry = {
    status: LoadStatus
    data?: ColumnStats
}

type SourceInfoState = {
    info: Record<Id, InfoEntry>
    stats: Record<Id, Record<string, StatsEntry>>
}

const initialState: SourceInfoState = {
    info: {},
    stats: {},
}

export const sourceInfoSlice = createSlice({
    name: "sourceInfo",
    initialState,
    reducers: {
        infoRequested: (state, action: PayloadAction<Id>) => {
            state.info[action.payload] = { status: "pending" }
        },
        infoReceived: (state, action: PayloadAction<{ id: Id; info: SourceInfo }>) => {
            const { id, info } = action.payload
            state.info[id] = {
                status: "ready",
                file: info.file,
                details: info.details,
            }
        },
        infoFailed: (state, action: PayloadAction<Id>) => {
            state.info[action.payload] = { status: "error" }
        },
        statsRequested: (state, action: PayloadAction<{ id: Id; column: string }>) => {
            const { id, column } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "pending" }
            state.stats[id] = bySource
        },
        statsReceived: (
            state,
            action: PayloadAction<{ id: Id; column: string; stats: ColumnStats }>,
        ) => {
            const { id, column, stats } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "ready", data: stats }
            state.stats[id] = bySource
        },
        statsFailed: (state, action: PayloadAction<{ id: Id; column: string }>) => {
            const { id, column } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "error" }
            state.stats[id] = bySource
        },
        invalidate: (state, action: PayloadAction<Id>) => {
            const id = action.payload
            delete state.info[id]
            delete state.stats[id]
        },
    },
    selectors: {
        info: state => state.info,
        stats: state => state.stats,
    },
})

export const actions = sourceInfoSlice.actions

export default sourceInfoSlice.reducer
```

`delete` on a draft object is how the existing `source` slice removes entries (`store/source/index.ts:164`), so it matches the codebase rather than introducing a new idiom.

- [ ] **Step 4: Register the slice**

Add `sourceInfo` to the `reducer` map in `apps/sphere/src/store/index.ts` and `sourceInfo: sourceInfoSlice.actions` to `apps/sphere/src/store/actions.ts`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- sourceInfo && npm run typecheck`
Expected: PASS — 6 tests.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add apps/sphere/src/store/sourceInfo apps/sphere/src/store/index.ts apps/sphere/src/store/actions.ts
git commit -m "Add sourceInfo slice for info and column stats caches"
```

---

### Task 15: Add the load-source-info listener

**Files:**
- Create: `apps/sphere/src/store/listeners/load-source-info.ts`, `apps/sphere/src/store/listeners/load-source-info.test.ts`
- Modify: `apps/sphere/src/store/listeners/index.ts`, `apps/sphere/src/store/index.ts`

**Interfaces:**
- Consumes: `sourceInfo` actions (Task 14), `SourceReader.getInfo` / `getColumnStats` (Task 13), `actions.source.select`.
- Produces: a listener middleware export, default.

- [ ] **Step 1: Write the failing tests**

Create `apps/sphere/src/store/listeners/load-source-info.test.ts`:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { actions } from "../actions"
import listener from "./load-source-info"

const info = {
    file: { size_bytes: 10, modified: null },
    schema: { columns: { alpha: "String", beta: "Number" }, points_count: 1 },
    details: { format: "geojson" },
}

const statsFor = (column: string) => ({
    column,
    col_type: "String",
    count: 1,
    null_count: 0,
})

function makeStore(preloaded: object = { sourceInfo: { info: {}, stats: {} } }) {
    const dispatched: { type: string; payload?: unknown }[] = []
    const store = configureStore({
        reducer: (s: object = preloaded) => s,
        middleware: getDefault =>
            getDefault()
                .prepend(listener.middleware)
                .concat(() => next => action => {
                    dispatched.push(action as { type: string })
                    return next(action)
                }),
    })
    return { store, dispatched }
}

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

describe("load-source-info listener", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
        mockInvoke.mockImplementation((cmd: string, args: { column?: string }) => {
            if (cmd === "source_get_info") return Promise.resolve(info)
            if (cmd === "source_get_column_stats") return Promise.resolve(statsFor(args.column ?? ""))
            return Promise.resolve(null)
        })
    })

    test("fetches info then one stats call per column", async () => {
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        const commands = mockInvoke.mock.calls.map(call => call[0])
        expect(commands.filter(c => c === "source_get_info")).toHaveLength(1)
        expect(commands.filter(c => c === "source_get_column_stats")).toHaveLength(2)
    })

    test("dispatches each stats result as it arrives, in column order", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        const received = dispatched
            .filter(a => a.type === "sourceInfo/statsReceived")
            .map(a => (a.payload as { column: string }).column)
        expect(received).toEqual(["alpha", "beta"])
    })

    test("skips columns already cached for that source", async () => {
        const { store } = makeStore({
            sourceInfo: {
                info: {},
                stats: { s1: { alpha: { status: "ready", data: statsFor("alpha") } } },
            },
        })

        store.dispatch(actions.source.select("s1"))
        await flush()

        const statsColumns = mockInvoke.mock.calls
            .filter(call => call[0] === "source_get_column_stats")
            .map(call => (call[1] as { column: string }).column)
        expect(statsColumns).toEqual(["beta"])
    })

    test("stops issuing stats calls once a newer selection cancels the run", async () => {
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        store.dispatch(actions.source.select("s2"))
        await flush()

        const infoIds = mockInvoke.mock.calls
            .filter(call => call[0] === "source_get_info")
            .map(call => (call[1] as { id: string }).id)
        expect(infoIds).toContain("s2")
    })

    test("dispatches infoFailed and issues no stats calls when info fails", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_get_info") return Promise.reject(new Error("boom"))
            return Promise.resolve(null)
        })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        expect(dispatched.some(a => a.type === "sourceInfo/infoFailed")).toBe(true)
        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_column_stats")).toBe(false)
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- load-source-info`
Expected: FAIL — cannot resolve `./load-source-info`.

- [ ] **Step 3: Implement the listener**

```ts
const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.source.select,
    effect: async (action, listenerApi) => {
        listenerApi.cancelActiveListeners()

        const id = action.payload
        if (!id) return

        listenerApi.dispatch(actions.sourceInfo.infoRequested(id))
        const reader = new SourceReader(id)
        const info = await reader.getInfo()
        if (!info) {
            listenerApi.dispatch(actions.sourceInfo.infoFailed(id))
            return
        }
        listenerApi.dispatch(actions.sourceInfo.infoReceived({ id, info }))

        const state = listenerApi.getState() as RootState
        const cached = state.sourceInfo.stats[id] ?? {}
        const columns = Object.keys(info.schema.columns).sort()

        for (const column of columns) {
            if (listenerApi.signal.aborted) return
            if (cached[column]?.status === "ready") continue

            listenerApi.dispatch(actions.sourceInfo.statsRequested({ id, column }))
            const stats = await reader.getColumnStats(column)
            if (listenerApi.signal.aborted) return
            if (stats) {
                listenerApi.dispatch(actions.sourceInfo.statsReceived({ id, column, stats }))
            } else {
                listenerApi.dispatch(actions.sourceInfo.statsFailed({ id, column }))
            }
        }
    },
})

export default listener
```

Sequential, not parallel: each call is a full scan of the feature store, so concurrency would not improve time-to-first-result and would saturate the blocking pool.

- [ ] **Step 4: Add invalidation triggers**

In the same file, add two more `startListening` registrations that dispatch `actions.sourceInfo.invalidate(id)`: one on `actions.source.removeSource`, one on `actions.source.bumpVersion` (drawing and CSV re-parse both change the data).

- [ ] **Step 5: Register the listener**

Add `export { default as loadSourceInfo } from "./load-source-info"` to `apps/sphere/src/store/listeners/index.ts` and `listeners.loadSourceInfo.middleware,` to the `prepend` list in `apps/sphere/src/store/index.ts`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- load-source-info && npm run typecheck`
Expected: PASS — 5 tests.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/store/listeners/load-source-info.ts apps/sphere/src/store/listeners/load-source-info.test.ts apps/sphere/src/store/listeners/index.ts apps/sphere/src/store/index.ts
git commit -m "Load source info and column stats progressively on select"
```

---

### Task 16: Add the apply-csv-geometry listener

**Files:**
- Create: `apps/sphere/src/store/sourceInfo/applyCsvGeometry.ts`, `apps/sphere/src/store/listeners/apply-csv-geometry.ts`, `apps/sphere/src/store/listeners/apply-csv-geometry.test.ts`
- Modify: `apps/sphere/src/store/listeners/index.ts`, `apps/sphere/src/store/index.ts`, `apps/sphere/src/store/actions.ts`

**Interfaces:**
- Consumes: `SourceReader.setCsvGeometry` (Task 13), `sourceMetadataFromSchema` (Task 10), `actions.source.setGeojsonMeta`, `actions.source.bumpVersion`, `actions.selection.*`, `actions.error.fail`.
- Produces: `applyCsvGeometry = createAction<{ id: Id } & CsvGeometryParams>("sourceInfo/applyCsvGeometry")`.

- [ ] **Step 1: Write the failing tests**

Create `apps/sphere/src/store/listeners/apply-csv-geometry.test.ts`:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { actions } from "../actions"
import listener from "./apply-csv-geometry"

const schema = {
    columns: { name: "String" },
    points_count: 2,
    multi_points_count: 0,
    lines_count: 0,
    multi_lines_count: 0,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 2,
}

function makeStore() {
    const dispatched: { type: string; payload?: unknown }[] = []
    const store = configureStore({
        reducer: (s: object = {}) => s,
        middleware: getDefault =>
            getDefault()
                .prepend(listener.middleware)
                .concat(() => next => action => {
                    dispatched.push(action as { type: string })
                    return next(action)
                }),
    })
    return { store, dispatched }
}

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

const apply = () =>
    actions.sourceInfo.applyCsvGeometry({
        id: "s1",
        mode: "xy" as const,
        xColumn: "longitude",
        yColumn: "latitude",
    })

describe("apply-csv-geometry listener", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
        mockInvoke.mockResolvedValue(schema)
    })

    test("invokes source_set_csv_geometry with the staged params", async () => {
        const { store } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(mockInvoke).toHaveBeenCalledWith("source_set_csv_geometry", {
            id: "s1",
            mode: "xy",
            wktColumn: null,
            xColumn: "longitude",
            yColumn: "latitude",
        })
    })

    test("dispatches setGeojsonMeta with the returned schema", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        const meta = dispatched.find(a => a.type === "source/setGeojsonMeta")
        expect(meta?.payload).toMatchObject({ id: "s1", meta: { pointsCount: 2, featuresCount: 2 } })
    })

    test("dispatches bumpVersion so the map re-fetches", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "source/bumpVersion")).toBe(true)
    })

    test("clears the selection because feature ids were reassigned", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "selection/reset")).toBe(true)
    })

    test("invalidates the cached stats for that source", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        const invalidate = dispatched.find(a => a.type === "sourceInfo/invalidate")
        expect(invalidate?.payload).toBe("s1")
    })

    test("reports the error and changes nothing when the command rejects", async () => {
        mockInvoke.mockRejectedValue(new Error("xy mode requires both an x column and a y column"))
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "error/setError")).toBe(true)
        expect(dispatched.some(a => a.type === "source/bumpVersion")).toBe(false)
        expect(dispatched.some(a => a.type === "source/setGeojsonMeta")).toBe(false)
        expect(dispatched.some(a => a.type === "selection/reset")).toBe(false)
    })
})
```

The last test is the one that matters most: a rejected apply must leave the staged picker values alone, so the listener dispatches nothing that would reset them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- apply-csv-geometry`
Expected: FAIL — cannot resolve `./apply-csv-geometry`.

- [ ] **Step 3: Define the action**

Create `apps/sphere/src/store/sourceInfo/applyCsvGeometry.ts`:

```ts
import type { CsvGeometryParams } from "@/lib/source-reader"
import type { Id } from "@/types"
import { createAction } from "@reduxjs/toolkit"

export type ApplyCsvGeometryPayload = CsvGeometryParams & { id: Id }

export const applyCsvGeometry = createAction<ApplyCsvGeometryPayload>("sourceInfo/applyCsvGeometry")
```

Bundle it with the slice's actions so components reach it as `actions.sourceInfo.applyCsvGeometry`. In `apps/sphere/src/store/actions.ts`:

```ts
import { applyCsvGeometry } from "./sourceInfo/applyCsvGeometry"
import { sourceInfoSlice } from "./sourceInfo"
```

```ts
    sourceInfo: { ...sourceInfoSlice.actions, applyCsvGeometry },
```

This replaces the plain `sourceInfo: sourceInfoSlice.actions` entry added in Task 14.

- [ ] **Step 4: Implement the listener**

```ts
const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: applyCsvGeometry,
    effect: async (action, listenerApi) => {
        const { id, mode, wktColumn, xColumn, yColumn } = action.payload
        const reader = new SourceReader(id)

        try {
            const schema = await reader.setCsvGeometry({ mode, wktColumn, xColumn, yColumn })
            listenerApi.dispatch(
                actions.source.setGeojsonMeta({ id, meta: sourceMetadataFromSchema(schema) }),
            )
            listenerApi.dispatch(actions.sourceInfo.invalidate(id))
            listenerApi.dispatch(actions.selection.reset())
            listenerApi.dispatch(actions.source.bumpVersion(id))
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            listenerApi.dispatch(actions.error.setError(message))
        }
    },
})

export default listener
```

Two names verified against the codebase rather than assumed: the error action is `actions.error.setError` (`store/error.ts:21`) — there is no `fail` action; `fail` is the name of a *listener* (`store/listeners/fail.ts`) that dispatches `setError`. The selection-clearing action is `actions.selection.reset` (`store/selection/index.ts:30`).

`invalidate` is dispatched before `bumpVersion` so the stats reload has a single trigger.

- [ ] **Step 5: Register the listener**

Add the export to `apps/sphere/src/store/listeners/index.ts` and the middleware to the `prepend` list in `apps/sphere/src/store/index.ts`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -w @sphere/app -- apply-csv-geometry && npm run typecheck`
Expected: PASS — 6 tests.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/store/sourceInfo/applyCsvGeometry.ts apps/sphere/src/store/listeners/apply-csv-geometry.ts apps/sphere/src/store/listeners/apply-csv-geometry.test.ts apps/sphere/src/store/listeners/index.ts apps/sphere/src/store/index.ts apps/sphere/src/store/actions.ts
git commit -m "Apply CSV geometry changes through a listener"
```

---

### Task 17: Add the sourceInfo selectors

**Files:**
- Create: `apps/sphere/src/store/sourceInfo/selectors.ts`, `apps/sphere/src/store/sourceInfo/selectors.test.ts`
- Modify: `apps/sphere/src/store/selectors.ts`

**Interfaces:**
- Consumes: the `sourceInfo` slice (Task 14), `selectors.source.selectSelectedId`.
- Produces:

```ts
export type FieldSummary =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "numeric"; min?: number; max?: number; mean?: number; histogram: number[] }
    | { kind: "string"; unique: number; topValues: [string, number][] }

export type FieldEntry = {
    name: string
    type: string
    nullCount?: number
    summary: FieldSummary
}
```

`selectCurrentSourceInfo(state)` → `{ status, file, details } | null`; `selectCurrentSourceFields(state)` → `FieldEntry[]`.

- [ ] **Step 1: Write the failing tests**

Create `apps/sphere/src/store/sourceInfo/selectors.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { selectCurrentSourceFields } from "./selectors"

const makeState = (overrides: object = {}) =>
    ({
        source: { items: {}, allIds: [], selectedId: "s1" },
        sourceInfo: { info: {}, stats: {} },
        ...overrides,
    }) as never

describe("selectCurrentSourceFields", () => {
    test("returns an empty array when nothing is selected", () => {
        const state = makeState({ source: { items: {}, allIds: [] } })
        expect(selectCurrentSourceFields(state)).toEqual([])
    })

    test("marks a column with no stats yet as loading", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { name: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: { info: {}, stats: {} },
        })
        const fields = selectCurrentSourceFields(state)
        expect(fields).toHaveLength(1)
        expect(fields[0]?.summary.kind).toBe("loading")
    })

    test("builds a numeric summary from a histogram", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { elevation: "Number" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: {
                info: {},
                stats: {
                    s1: {
                        elevation: {
                            status: "ready",
                            data: {
                                column: "elevation",
                                col_type: "Number",
                                count: 3,
                                null_count: 1,
                                min: 0,
                                max: 10,
                                mean: 5,
                                histogram: [{ min: 0, max: 5, count: 2 }, { min: 5, max: 10, count: 1 }],
                            },
                        },
                    },
                },
            },
        })
        const fields = selectCurrentSourceFields(state)
        expect(fields[0]?.summary).toEqual({
            kind: "numeric",
            min: 0,
            max: 10,
            mean: 5,
            histogram: [2, 1],
        })
        expect(fields[0]?.nullCount).toBe(1)
    })

    test("builds a string summary from unique count and top values", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { region: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: {
                info: {},
                stats: {
                    s1: {
                        region: {
                            status: "ready",
                            data: {
                                column: "region",
                                col_type: "String",
                                count: 3,
                                null_count: 0,
                                unique_count: 342,
                                top_values: [["Moscow", 1204]],
                            },
                        },
                    },
                },
            },
        })
        expect(selectCurrentSourceFields(state)[0]?.summary).toEqual({
            kind: "string",
            unique: 342,
            topValues: [["Moscow", 1204]],
        })
    })

    test("sorts fields by name", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { zebra: "String", alpha: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: { info: {}, stats: {} },
        })
        expect(selectCurrentSourceFields(state).map(f => f.name)).toEqual(["alpha", "zebra"])
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- sourceInfo/selectors`
Expected: FAIL — cannot resolve `./selectors`.

- [ ] **Step 3: Implement the selectors**

Create `apps/sphere/src/store/sourceInfo/selectors.ts`:

```ts
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { selectCurrentSourceItem } from "@/components/SourcePanel"
import { sourceInfoSlice } from "."
import type { StatsEntry } from "."

export type FieldSummary =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "numeric"; min?: number; max?: number; mean?: number; histogram: number[] }
    | { kind: "string"; unique: number; topValues: [string, number][] }

export type FieldEntry = {
    name: string
    type: string
    nullCount?: number
    summary: FieldSummary
}

function toSummary(entry: StatsEntry | undefined): FieldSummary {
    if (!entry || entry.status === "pending") {
        return { kind: "loading" }
    }
    if (entry.status === "error" || !entry.data) {
        return { kind: "error" }
    }
    const data = entry.data
    if (data.histogram) {
        return {
            kind: "numeric",
            min: data.min,
            max: data.max,
            mean: data.mean,
            histogram: data.histogram.map(bin => bin.count),
        }
    }
    return {
        kind: "string",
        unique: data.unique_count ?? 0,
        topValues: data.top_values ?? [],
    }
}

const selectStats = sourceInfoSlice.selectors.stats
const selectInfo = sourceInfoSlice.selectors.info
const selectSelectedId = (state: RootState) => state.source.selectedId

export const selectCurrentSourceInfo = createSelector(
    [selectInfo, selectSelectedId],
    (info, id) => (id ? (info[id] ?? null) : null),
)

export const selectCurrentSourceFields = createSelector(
    [selectCurrentSourceItem, selectStats, selectSelectedId],
    (source, stats, id): FieldEntry[] => {
        if (!source || !id || !("meta" in source) || !source.meta) {
            return []
        }
        const bySource = stats[id] ?? {}
        return Object.entries(source.meta.columns)
            .map(([name, type]) => {
                const entry = bySource[name]
                return {
                    name,
                    type,
                    nullCount: entry?.data?.null_count,
                    summary: toSummary(entry),
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))
    },
)
```

`toSummary` uses early returns rather than nested ternaries, and the numeric/string choice keys off `histogram` presence — the backend sets `histogram` only when it collected numeric values and `unique_count` only when it collected strings, so a column that is genuinely empty falls through to an empty string summary rather than a wrong numeric one.

- [ ] **Step 4: Move `selectCurrentSourceItem` into the store**

`selectCurrentSourceItem` lives in `components/SourcePanel/index.tsx:12` today. Importing it from a store module would make `store/sourceInfo/selectors.ts` → `components/SourcePanel` → `store/sourceInfo/selectors.ts` a cycle. A selector belongs in the store anyway.

Move it verbatim to `apps/sphere/src/store/source/index.ts`:

```ts
export const selectCurrentSourceItem = createSelector(
    [sourceSlice.selectors.selectSelectedId, sourceSlice.selectors.items],
    (id, items) => (id ? (items[id] ?? null) : null),
)
```

Re-export it from `store/selectors.ts` under `selectors.source`, update the import in `store/sourceInfo/selectors.ts` to `from "../source"`, and update `components/SourcePanel/index.test.ts:5`, which imports it from `./index`. Task 19 then imports it from the store rather than defining it.

Run: `rg -n "selectCurrentSourceItem" apps/sphere/src` — expected: the definition in `store/source/index.ts`, the re-export, and consumers; no definition left in the component.

- [ ] **Step 5: Export from the barrel**

Add `sourceInfo` to the exported `selectors` object in `apps/sphere/src/store/selectors.ts`, matching how `source` and `layer` are exported there.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -w @sphere/app && npm run typecheck`
Expected: PASS — 5 selector tests, the 6 reducer tests from Task 14, and the existing `SourcePanel/index.test.ts` still green after the selector move.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/store/sourceInfo/selectors.ts apps/sphere/src/store/sourceInfo/selectors.test.ts apps/sphere/src/store/selectors.ts
git commit -m "Add selectors deriving field entries from schema and stats"
```

---

### Task 18: Build the shared panel primitives

**Files:**
- Create: `apps/sphere/src/components/SourcePanel/parts/InfoRow.tsx`, `NumericSummary.tsx`, `StringSummary.tsx`, `FieldRow.tsx`, `GeometryCounts.tsx`, `AttributeList.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `FieldEntry`, `FieldSummary` (Task 17), `SourceMetadata` (Task 10).
- Produces: `<InfoRow label value />`, `<NumericSummary summary />`, `<StringSummary summary />`, `<FieldRow field />`, `<GeometryCounts meta />`, `<AttributeList fields />`.

These leaves stay app-local and presentational — they take props and render. The histogram reuses the existing `BarChart` in `packages/ui/src/PropertiesTable/BarChart.tsx` rather than duplicating a visx chart; it only needs exporting.

- [ ] **Step 1: Export BarChart from the ui barrel**

Add to `packages/ui/src/index.ts`:

```ts
export * from "./PropertiesTable/BarChart"
```

No version bump: `@sphere/ui` is a private workspace package pinned at `0.0.0` by design.

- [ ] **Step 2: Write InfoRow**

```tsx
import { Group, Text } from "@mantine/core"

export type InfoRowProps = {
    label: string
    value: React.ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
    return (
        <Group position={"apart"} spacing={"xs"} noWrap>
            <Text size={"xs"} color={"dimmed"}>
                {label}
            </Text>
            <Text size={"xs"}>{value}</Text>
        </Group>
    )
}
```

- [ ] **Step 3: Write NumericSummary and StringSummary**

```tsx
import { BarChart } from "@sphere/ui"
import { Stack, Text } from "@mantine/core"
import type { FieldSummary } from "@/store/sourceInfo/selectors"
import { InfoRow } from "./InfoRow"

const HISTOGRAM_WIDTH = 120
const HISTOGRAM_HEIGHT = 28
const HISTOGRAM_COLOR = "rgb(34, 139, 230)"

export type NumericSummaryProps = {
    summary: Extract<FieldSummary, { kind: "numeric" }>
}

export function NumericSummary({ summary }: NumericSummaryProps) {
    return (
        <Stack spacing={2}>
            <BarChart
                data={summary.histogram}
                width={HISTOGRAM_WIDTH}
                height={HISTOGRAM_HEIGHT}
                color={HISTOGRAM_COLOR}
            />
            {summary.min === undefined ? null : <InfoRow label={"min"} value={summary.min} />}
            {summary.max === undefined ? null : <InfoRow label={"max"} value={summary.max} />}
            {summary.mean === undefined ? null : <InfoRow label={"mean"} value={summary.mean} />}
        </Stack>
    )
}
```

```tsx
export type StringSummaryProps = {
    summary: Extract<FieldSummary, { kind: "string" }>
}

export function StringSummary({ summary }: StringSummaryProps) {
    const remaining = summary.unique - summary.topValues.length
    return (
        <Stack spacing={2}>
            <Text size={"xs"} color={"dimmed"}>
                {summary.unique} unique
            </Text>
            {summary.topValues.map(([value, count]) => (
                <InfoRow key={value} label={value} value={count} />
            ))}
            {remaining > 0 ? (
                <Text size={"xs"} color={"dimmed"}>
                    …{remaining} more
                </Text>
            ) : null}
        </Stack>
    )
}
```

The named constants exist because inline `120` / `28` / the colour literal would be magic numbers.

- [ ] **Step 4: Write FieldRow**

```tsx
import { Badge, Group, Skeleton, Stack, Text } from "@mantine/core"
import type { FieldEntry } from "@/store/sourceInfo/selectors"
import { NumericSummary } from "./NumericSummary"
import { StringSummary } from "./StringSummary"

const SKELETON_HEIGHT = 28

export type FieldRowProps = {
    field: FieldEntry
}

function renderSummary(field: FieldEntry) {
    switch (field.summary.kind) {
        case "numeric":
            return <NumericSummary summary={field.summary} />
        case "string":
            return <StringSummary summary={field.summary} />
        case "error":
            return (
                <Text size={"xs"} color={"dimmed"}>
                    stats unavailable
                </Text>
            )
        default:
            return <Skeleton height={SKELETON_HEIGHT} />
    }
}

export function FieldRow({ field }: FieldRowProps) {
    return (
        <Stack spacing={4}>
            <Group spacing={"xs"} noWrap>
                <Text size={"xs"} weight={500}>
                    {field.name}
                </Text>
                <Badge size={"xs"} radius={"sm"}>
                    {field.type}
                </Badge>
                {field.nullCount && field.nullCount > 0 ? (
                    <Text size={"xs"} color={"dimmed"}>
                        {field.nullCount} null
                    </Text>
                ) : null}
            </Group>
            {renderSummary(field)}
        </Stack>
    )
}
```

A `switch` in a helper, not nested ternaries in JSX.

- [ ] **Step 5: Write GeometryCounts and AttributeList**

```tsx
import { Stack, Text } from "@mantine/core"
import type { SourceMetadata } from "@/types"
import { InfoRow } from "./InfoRow"

export type GeometryCountsProps = {
    meta: SourceMetadata
}

function bucketValue(total: number, multi: number) {
    return multi > 0 ? `${total} (${multi} multi)` : `${total}`
}

export function GeometryCounts({ meta }: GeometryCountsProps) {
    return (
        <Stack spacing={2}>
            <InfoRow label={"Features"} value={meta.featuresCount} />
            {meta.pointsCount > 0 ? (
                <InfoRow
                    label={"Points"}
                    value={bucketValue(meta.pointsCount, meta.multiPointsCount)}
                />
            ) : null}
            {meta.linesCount > 0 ? (
                <InfoRow label={"Lines"} value={bucketValue(meta.linesCount, meta.multiLinesCount)} />
            ) : null}
            {meta.polygonsCount > 0 ? (
                <InfoRow
                    label={"Polygons"}
                    value={bucketValue(meta.polygonsCount, meta.multiPolygonsCount)}
                />
            ) : null}
            {meta.collectionsCount > 0 ? (
                <InfoRow label={"Collections"} value={meta.collectionsCount} />
            ) : null}
            {meta.nullGeometryCount > 0 ? (
                <InfoRow label={"No geometry"} value={meta.nullGeometryCount} />
            ) : null}
        </Stack>
    )
}
```

```tsx
export type AttributeListProps = {
    fields: FieldEntry[]
}

export function AttributeList({ fields }: AttributeListProps) {
    if (fields.length === 0) {
        return (
            <Text size={"xs"} color={"dimmed"}>
                No attributes
            </Text>
        )
    }
    return (
        <Stack spacing={"sm"}>
            {fields.map(field => (
                <FieldRow key={field.name} field={field} />
            ))}
        </Stack>
    )
}
```

`Features` always shows; empty buckets are omitted. The empty attribute list renders an honest `No attributes` rather than hiding the section.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. Any `noRestrictedImports` failure means a leaf reached for Redux or Tauri — restructure so it takes props instead.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/SourcePanel/parts packages/ui/src/index.ts
git commit -m "Add shared presentational primitives for the source panel"
```

---

### Task 19: Rebuild SourcePanel with format dispatch and the GeoJSON panel

**Files:**
- Modify: `apps/sphere/src/components/SourcePanel/index.tsx`, `apps/sphere/src/components/SourcePanel/index.test.ts`
- Create: `apps/sphere/src/components/SourcePanel/GeojsonSourcePanel.tsx`

**Interfaces:**
- Consumes: `SourceFormat` (Task 9), `isRasterTileFormat` (`@/lib/tilejson`), the parts from Task 18, the selectors from Task 17.
- Produces: `selectPanelKind(state) -> "geojson" | "csv" | "shapefile" | "gpx" | "vector-tiles" | "raster-tiles" | null`, exported from `index.tsx` for testing.

- [ ] **Step 1: Write the failing tests**

Add to `apps/sphere/src/components/SourcePanel/index.test.ts`:

```ts
describe("selectPanelKind", () => {
    test("returns null when nothing is selected", () => {
        const state = makeRootState({ source: { items: {}, allIds: [] } })
        expect(selectPanelKind(state)).toBeNull()
    })

    test("routes a csv-format Geojson source to the csv panel", () => {
        const source = makeCsvSource("s1")
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("csv")
    })

    test("routes a geojson-format source to the geojson panel", () => {
        const state = makeRootState({
            source: { items: { s1: makeGeojsonSource("s1") }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("geojson")
    })

    test("routes a FeatureCollection source to the geojson panel", () => {
        const source = {
            id: "s1",
            name: "drawn",
            type: SourceType.FeatureCollection,
            location: "sphere://s1",
            version: 0,
            fractionIndex: 0,
            editable: true,
            pending: false,
            meta: { columns: {} },
        }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("geojson")
    })

    test("routes an MVT source with a pbf format to the vector tiles panel", () => {
        const source = makeMvtSource("s1", { format: "pbf" as const })
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("vector-tiles")
    })

    test("routes an MVT source with a raster tile format to the raster tiles panel", () => {
        const source = makeMvtSource("s1", { format: "png" as const })
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("raster-tiles")
    })

    test("routes a Raster source to the raster tiles panel", () => {
        const source = { ...makeGeojsonSource("s1"), type: SourceType.Raster }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("raster-tiles")
    })
})
```

Import `makeCsvSource` and `makeMvtSource` from `@/testutils`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @sphere/app -- SourcePanel`
Expected: FAIL — `selectPanelKind` is not exported.

- [ ] **Step 3: Implement selectPanelKind**

```ts
export type PanelKind =
    | "geojson"
    | "csv"
    | "shapefile"
    | "gpx"
    | "vector-tiles"
    | "raster-tiles"

export const selectPanelKind = createSelector(
    [selectCurrentSourceItem],
    (source): PanelKind | null => {
        if (!source) {
            return null
        }
        switch (source.type) {
            case SourceType.Geojson:
                return source.format
            case SourceType.FeatureCollection:
                return "geojson"
            case SourceType.MVT:
                return isRasterTileFormat(source.format) ? "raster-tiles" : "vector-tiles"
            case SourceType.Raster:
                return "raster-tiles"
            default:
                return null
        }
    },
)
```

`source.format` on a `Geojson` source is already a `SourceFormat`, whose four members are exactly the first four `PanelKind` members — no mapping table needed. A single ternary in the `MVT` case is within the one-level limit.

- [ ] **Step 4: Strip the panel down to chrome plus dispatch**

Keep the `ActionBar` and the `Name` `TextInput` exactly as they are today (`index.tsx:78-166`). Delete the `Badge` block at `:168-189` — the geometry counts move into the format panels. Delete the commented-out icon block at `:53-75` while touching this file. Render the panel chosen by `selectPanelKind` beneath the Name field.

- [ ] **Step 5: Write GeojsonSourcePanel**

Add a `PanelSection` leaf to `parts/` first, since all six panels use it:

```tsx
export type PanelSectionProps = {
    title: string
    children: React.ReactNode
}

export function PanelSection({ title, children }: PanelSectionProps) {
    return (
        <Stack spacing={4}>
            <Text size={"xs"} weight={600} transform={"uppercase"} color={"dimmed"}>
                {title}
            </Text>
            {children}
        </Stack>
    )
}
```

Then a `FileSection` leaf, because every file-backed panel repeats it:

```tsx
export type FileSectionProps = {
    file: FileInfo | null | undefined
}

export function FileSection({ file }: FileSectionProps) {
    if (!file) {
        return null
    }
    return (
        <PanelSection title={"File"}>
            <InfoRow label={"Size"} value={formatBytes(file.size_bytes)} />
            {file.modified ? <InfoRow label={"Modified"} value={formatEpoch(file.modified)} /> : null}
        </PanelSection>
    )
}
```

`formatBytes` and `formatEpoch` are pure string helpers with no React, Redux or Tauri dependency, so they belong in `@sphere/utils` — add them to `packages/utils/src/` and its barrel, with unit tests. `modified` arrives as a Unix-seconds string from `source_get_info` (Task 7).

Then the panel itself:

```tsx
export function GeojsonSourcePanel() {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />
            {meta ? (
                <PanelSection title={"Geometry"}>
                    <GeometryCounts meta={meta} />
                </PanelSection>
            ) : null}
            <PanelSection title={"Attributes"}>
                <AttributeList fields={fields} />
            </PanelSection>
        </Stack>
    )
}
```

`selectCurrentSourceMeta` is a one-line addition to `store/sourceInfo/selectors.ts`, returning `source.meta` for a source that has one and `null` otherwise. Add it with a test alongside the Task 17 selectors. The component computes nothing.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -w @sphere/app && npm run typecheck && npm run lint`
Expected: PASS and clean.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/SourcePanel
git commit -m "Dispatch the source panel by format and add the GeoJSON panel"
```

---

### Task 20: Add the CSV panel and geometry config

**Files:**
- Create: `apps/sphere/src/components/SourcePanel/CsvSourcePanel.tsx`, `apps/sphere/src/components/SourcePanel/CsvGeometryConfig.tsx`

**Interfaces:**
- Consumes: `applyCsvGeometry` (Task 16), `selectCurrentSourceInfo` (Task 17), the parts from Task 18.
- Produces: `<CsvSourcePanel />`, `<CsvGeometryConfig sourceId details />`.

- [ ] **Step 1: Write the staged-state helper and its tests**

The "is Apply enabled" rule is logic, so it lives outside the component and gets tested. Add to `apps/sphere/src/lib/csv-geometry.ts` with `apps/sphere/src/lib/csv-geometry.test.ts`:

```ts
import type { CsvMode } from "@/lib/source-reader"

export type StagedCsvGeometry = {
    mode: CsvMode
    wktColumn?: string
    xColumn?: string
    yColumn?: string
}

export function isStagedGeometryComplete(staged: StagedCsvGeometry): boolean {
    if (staged.mode === "wkt") {
        return Boolean(staged.wktColumn)
    }
    return Boolean(staged.xColumn) && Boolean(staged.yColumn)
}

export function isStagedGeometryChanged(
    staged: StagedCsvGeometry,
    applied: StagedCsvGeometry,
): boolean {
    if (staged.mode !== applied.mode) {
        return true
    }
    if (staged.mode === "wkt") {
        return staged.wktColumn !== applied.wktColumn
    }
    return staged.xColumn !== applied.xColumn || staged.yColumn !== applied.yColumn
}

export function canApplyCsvGeometry(
    staged: StagedCsvGeometry,
    applied: StagedCsvGeometry,
): boolean {
    return isStagedGeometryComplete(staged) && isStagedGeometryChanged(staged, applied)
}
```

Tests cover: xy incomplete when only x is set; xy complete with both; wkt incomplete with no column; a mode switch counting as changed; identical staged and applied counting as unchanged; and `canApplyCsvGeometry` false when complete but unchanged.

- [ ] **Step 2: Write CsvGeometryConfig**

```tsx
const MODE_OPTIONS = [
    { label: "X / Y", value: "xy" },
    { label: "WKT", value: "wkt" },
]

export type CsvGeometryConfigProps = {
    sourceId: Id
    details: Extract<FormatDetails, { format: "csv" }>
}

export function CsvGeometryConfig({ sourceId, details }: CsvGeometryConfigProps) {
    const dispatch = useAppDispatch()
    const applied: StagedCsvGeometry = {
        mode: details.mode,
        wktColumn: details.wkt_column ?? undefined,
        xColumn: details.x_column ?? undefined,
        yColumn: details.y_column ?? undefined,
    }
    const [staged, setStaged] = useState<StagedCsvGeometry>(applied)

    const options = buildColumnOptions(details.header_columns, applied)
    const missing = missingAppliedColumns(details.header_columns, applied)

    return (
        <Stack spacing={"xs"}>
            <SegmentedControl
                size={"xs"}
                data={MODE_OPTIONS}
                value={staged.mode}
                onChange={value => {
                    if (value === "xy" || value === "wkt") {
                        setStaged({ ...staged, mode: value })
                    }
                }}
            />
            {staged.mode === "wkt" ? (
                <Select
                    size={"xs"}
                    label={"WKT column"}
                    data={options}
                    value={staged.wktColumn ?? null}
                    onChange={value => setStaged({ ...staged, wktColumn: value ?? undefined })}
                />
            ) : (
                <>
                    <Select
                        size={"xs"}
                        label={"X column"}
                        data={options}
                        value={staged.xColumn ?? null}
                        onChange={value => setStaged({ ...staged, xColumn: value ?? undefined })}
                    />
                    <Select
                        size={"xs"}
                        label={"Y column"}
                        data={options}
                        value={staged.yColumn ?? null}
                        onChange={value => setStaged({ ...staged, yColumn: value ?? undefined })}
                    />
                </>
            )}
            {missing.length === 0 ? null : (
                <Text size={"xs"} color={"orange"}>
                    Not in this file: {missing.join(", ")}
                </Text>
            )}
            <Button
                size={"xs"}
                disabled={!canApplyCsvGeometry(staged, applied)}
                onClick={() => {
                    dispatch(actions.sourceInfo.applyCsvGeometry({ id: sourceId, ...staged }))
                }}
            >
                Apply
            </Button>
        </Stack>
    )
}
```

`buildColumnOptions` and `missingAppliedColumns` are two more pure helpers in `lib/csv-geometry.ts`, tested alongside the others: the first returns the header columns plus any applied column that is absent from them (so a stale applied value still renders as selected rather than vanishing); the second returns just those absent applied columns, for the warning.

`CsvSourcePanel` mounts this with `key={sourceId}`, so switching sources resets the staged values — the `key`-to-reset pattern CLAUDE.md requires instead of suppressing `useExhaustiveDependencies`. The `onClick` dispatches and nothing else; the listener from Task 16 owns the rest.

- [ ] **Step 3: Write CsvSourcePanel**

```tsx
export function CsvSourcePanel() {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const sourceId = useAppSelector(selectors.source.selectSelectedId)
    const details = info?.details

    if (!sourceId || details?.format !== "csv") {
        return null
    }

    const totalRows = details.parsed_rows + details.skipped_rows

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"Geometry source"}>
                <CsvGeometryConfig key={sourceId} sourceId={sourceId} details={details} />
            </PanelSection>

            <PanelSection title={"Parsing"}>
                <InfoRow label={"Rows with geometry"} value={details.parsed_rows} />
                <InfoRow label={"Rows skipped"} value={details.skipped_rows} />
                {details.skipped_rows > 0 ? (
                    <Text size={"xs"} color={"orange"}>
                        {details.parsed_rows} of {totalRows} rows had valid geometry
                    </Text>
                ) : null}
            </PanelSection>

            {meta ? (
                <PanelSection title={"Geometry"}>
                    <GeometryCounts meta={meta} />
                </PanelSection>
            ) : null}

            <PanelSection title={"Attributes"}>
                <AttributeList fields={fields} />
            </PanelSection>
        </Stack>
    )
}
```

The Parsing section is always present, even when nothing was skipped — the honest empty state, never a hidden control.

- [ ] **Step 4: Run the helper tests, typecheck and lint**

Run: `npm test -w @sphere/app -- csv-geometry && npm run typecheck && npm run lint`
Expected: PASS and clean.

- [ ] **Step 5: Verify in the running app**

Run: `npm run tauri dev`. Load a CSV whose coordinate columns are named `longitude`/`latitude`. Confirm: the panel reports 0 valid rows, both columns appear in the pickers, selecting them and pressing Apply repopulates the map, the geometry counts update, and the attribute summaries refill.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/SourcePanel
git commit -m "Add the CSV source panel with geometry configuration"
```

---

### Task 21: Add the shapefile, GPX and tile panels

**Files:**
- Create: `apps/sphere/src/components/SourcePanel/ShapefileSourcePanel.tsx`, `GpxSourcePanel.tsx`, `VectorTilesSourcePanel.tsx`, `RasterTilesSourcePanel.tsx`

**Interfaces:**
- Consumes: `selectCurrentSourceInfo` (Task 17), `TileJSON` (`@/types/tilejson`), the parts from Task 18.
- Produces: the four remaining panel components.

- [ ] **Step 1: Write ShapefileSourcePanel**

```tsx
const SIDECARS = [
    { extension: ".dbf", key: "has_dbf" },
    { extension: ".shx", key: "has_shx" },
    { extension: ".prj", key: "has_prj" },
    { extension: ".cpg", key: "has_cpg" },
] as const

export function ShapefileSourcePanel() {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const details = info?.details

    if (details?.format !== "shapefile") {
        return null
    }

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"Sidecars & CRS"}>
                {SIDECARS.map(sidecar => (
                    <InfoRow
                        key={sidecar.extension}
                        label={sidecar.extension}
                        value={details[sidecar.key] ? "present" : "missing"}
                    />
                ))}
                <InfoRow label={"CRS"} value={details.crs ?? "unknown"} />
                {details.has_dbf ? null : (
                    <Text size={"xs"} color={"orange"}>
                        No .dbf sidecar — this shapefile has no attributes
                    </Text>
                )}
            </PanelSection>

            {meta ? (
                <PanelSection title={"Geometry"}>
                    <GeometryCounts meta={meta} />
                </PanelSection>
            ) : null}

            <PanelSection title={"Attributes"}>
                <AttributeList fields={fields} />
            </PanelSection>
        </Stack>
    )
}
```

The `SIDECARS` table is why the four flags are not four copy-pasted rows, and `as const` keeps `sidecar.key` a literal union so `details[sidecar.key]` type-checks without a cast.

- [ ] **Step 2: Write GpxSourcePanel**

Same shape, with the `Sidecars & CRS` section replaced by:

```tsx
            <PanelSection title={"GPX contents"}>
                <InfoRow label={"Waypoints"} value={details.waypoints} />
                <InfoRow label={"Tracks"} value={details.tracks} />
                <InfoRow label={"Routes"} value={details.routes} />
                <InfoRow label={"Track points"} value={details.track_points} />
            </PanelSection>
```

guarded by `if (details?.format !== "gpx") return null` so the union narrows.

- [ ] **Step 3: Write the shared TileJSON section**

Both tile panels show the same metadata block, so it is one leaf in `parts/TileJsonSection.tsx`:

```tsx
const DEFAULT_MIN_ZOOM = 0
const DEFAULT_MAX_ZOOM = 22

export type TileJsonSectionProps = {
    tilejson: TileJSON | null
}

export function TileJsonSection({ tilejson }: TileJsonSectionProps) {
    if (!tilejson) {
        return (
            <PanelSection title={"Tiles"}>
                <Text size={"xs"} color={"dimmed"}>
                    No tile metadata
                </Text>
            </PanelSection>
        )
    }
    const minzoom = tilejson.minzoom ?? DEFAULT_MIN_ZOOM
    const maxzoom = tilejson.maxzoom ?? DEFAULT_MAX_ZOOM

    return (
        <PanelSection title={"Tiles"}>
            {tilejson.format ? <InfoRow label={"Format"} value={tilejson.format} /> : null}
            <InfoRow label={"Zoom"} value={`${minzoom}–${maxzoom}`} />
            {tilejson.bounds ? <InfoRow label={"Bounds"} value={tilejson.bounds.join(", ")} /> : null}
            {tilejson.center ? <InfoRow label={"Center"} value={tilejson.center.join(", ")} /> : null}
            {tilejson.scheme ? <InfoRow label={"Scheme"} value={tilejson.scheme} /> : null}
            {tilejson.version ? <InfoRow label={"Version"} value={tilejson.version} /> : null}
            {tilejson.attribution ? (
                <InfoRow label={"Attribution"} value={tilejson.attribution} />
            ) : null}
            {tilejson.description ? (
                <InfoRow label={"Description"} value={tilejson.description} /> 
            ) : null}
        </PanelSection>
    )
}
```

Tile panels read `source.tilejson` from Redux and never call `source_get_info` — an MBTiles source has no feature store, and `source_get_info` would have nothing to report for it. Neither tile panel has a File section; the source's location is already shown in the panel chrome.

- [ ] **Step 4: Write VectorTilesSourcePanel and RasterTilesSourcePanel**

```tsx
export function VectorTilesSourcePanel() {
    const source = useAppSelector(selectCurrentSourceItem)
    if (!source || source.type !== SourceType.MVT) {
        return null
    }
    const layers = source.tilejson.vector_layers ?? []

    return (
        <Stack spacing={"md"}>
            <TileJsonSection tilejson={source.tilejson} />
            <PanelSection title={"Layers"}>
                {layers.length === 0 ? (
                    <Text size={"xs"} color={"dimmed"}>
                        No vector layers declared
                    </Text>
                ) : (
                    <Stack spacing={"sm"}>
                        {layers.map(layer => (
                            <Stack key={layer.id} spacing={2}>
                                <Text size={"xs"} weight={500}>
                                    {layer.id}
                                </Text>
                                {layer.description ? (
                                    <Text size={"xs"} color={"dimmed"}>
                                        {layer.description}
                                    </Text>
                                ) : null}
                                {Object.entries(layer.fields).map(([name, fieldType]) => (
                                    <InfoRow key={name} label={name} value={String(fieldType)} />
                                ))}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </PanelSection>
        </Stack>
    )
}
```

`RasterTilesSourcePanel` renders `<TileJsonSection tilejson={tilejson} />` alone, where `tilejson` is `source.tilejson` for an `MVT` source with a raster tile format and `null` for a `SourceType.Raster` source, which carries no TileJSON in Redux. The `null` branch is why `TileJsonSection` handles a missing payload rather than crashing.

`layer.fields` is typed `object` in `types/tilejson.ts:28`, so `Object.entries` yields `unknown` values — `String(fieldType)` is the conversion, not an `as` cast.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Verify in the running app**

Run: `npm run tauri dev`. Load a `.shp`, a `.gpx`, a vector `.mbtiles` and a raster `.mbtiles`. Confirm each selects into its own panel with populated sections and no console errors.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add apps/sphere/src/components/SourcePanel
git commit -m "Add shapefile, GPX and tile source panels"
```

---

### Task 22: Bump the crate version and verify the whole change

**Files:**
- Modify: `crates/libsphere/Cargo.toml:3`, `src-tauri/Cargo.lock`

**Interfaces:**
- Consumes: everything above.
- Produces: a releasable branch.

- [ ] **Step 1: Bump libsphere**

Change `version = "0.7.0"` to `version = "0.8.0"` in `crates/libsphere/Cargo.toml`. Once for the PR, not per commit.

- [ ] **Step 2: Update the lock file**

Run: `cd src-tauri && cargo update -p libsphere`
Expected: `Cargo.lock` updates `libsphere` to `0.8.0` and nothing else changes.

- [ ] **Step 3: Run every check**

```bash
npm run lint
npm run typecheck
npm test
cd src-tauri && cargo test && cargo build
```

Expected: all green. Record the actual output — do not claim success without reading it.

- [ ] **Step 4: Confirm no forbidden patterns were introduced**

```bash
rg -n ": any|biome-ignore|eslint-disable|console\.log" apps/sphere/src packages
rg -n "computeGeometryMeta" apps/sphere/src
```

Expected: no matches from either command.

- [ ] **Step 5: Commit**

```bash
git add crates/libsphere/Cargo.toml src-tauri/Cargo.lock
git commit -m "Bump libsphere to 0.8.0"
```

---

## Notes for the executor

- **Tasks 1–8 are backend and can be verified with `cargo test` alone.** Tasks 9–17 are state and can be verified with `npm test` alone. Tasks 18–21 need `npm run tauri dev` to confirm, because they are UI.
- **Task 5 adds no behavior.** It exists because CLAUDE.md forbids modifying an untested file and `src-tauri/src/commands/source.rs` has no test module. Do not skip it and do not expand it into a refactor.
- **The `CsvGeometry` variants are named `WKT` and `XY`** in `crates/libsphere/src/csv.rs:44-47`. Use those names exactly; renaming them is out of scope and would break `Source::create_data`.
- **`source_set_csv_geometry` reassigns feature ids.** Any change that skips the selection clear in Task 16 leaves the selection pointing at unrelated features.
- **If a task reveals the spec is wrong, stop and say so.** Do not silently redesign.
