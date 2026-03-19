# libsphere Extension Plan (Simplified)

## Context

`libsphere` (v0.2.0) already has per-format readers for GeoJSON, GeoJSONSeq, CSV, Shapefile, GPX, MBTiles. Current issues to address:
- All errors discard source context
- Frontend Redux store holds a full copy of GeoJSON dataset, doubling memory (MapLibre already holds its own copy)
- No server-side paginated attribute query — PropertiesTable loads the entire dataset
- No user-facing filter on layers

**Not in scope now (but architecture accommodates):** CRS/reprojection, transform pipelines, large file streaming, SQLite spatial index.

---

## New Crate: `libexpression`

Located at `crates/libexpression/`. Independently publishable — only depends on `serde_json`.

**Purpose:** Parse and evaluate [MapLibre Style Specification filter expressions](https://maplibre.org/maplibre-style-spec/expressions/) in Rust.

### Public API

```rust
// lib.rs
pub fn parse(raw: serde_json::Value) -> Result<Expr, ExprError>;

pub fn evaluate(
    expr: &Expr,
    context: &EvalContext,
) -> Result<serde_json::Value, ExprError>;

pub struct EvalContext<'a> {
    pub feature_id: Option<serde_json::Value>,
    pub feature_type: &'a str,           // "Point", "LineString", "Polygon", ...
    pub properties: &'a serde_json::Map<String, serde_json::Value>,
}
```

### Expression model — trait-based

Each expression type is its own struct implementing a common trait:

```rust
pub trait Expression: Send + Sync {
    fn evaluate(&self, ctx: &EvalContext) -> Result<serde_json::Value, ExprError>;
}

pub type Expr = Box<dyn Expression>;
```

Example impls:

```rust
pub struct Get { pub key: String }
impl Expression for Get { ... }

pub struct Has { pub key: String }
impl Expression for Has { ... }

pub struct Literal { pub value: serde_json::Value }
impl Expression for Literal { ... }

pub struct Eq { pub left: Expr, pub right: Expr }
impl Expression for Eq { ... }

pub struct All { pub args: Vec<Expr> }
impl Expression for All { ... }

pub struct Concat { pub args: Vec<Expr> }
impl Expression for Concat { ... }

// ... one struct per operator
```

`parse(raw: serde_json::Value) -> Result<Expr, ExprError>` dispatches on the operator string and constructs the appropriate struct. Unknown operators → `Err(ExprError::UnknownOperator(name))`, never panic.

### Tests (comprehensive)
Every operator tested against the MapLibre spec examples. Test categories:
- Comparison: all 6 operators on numbers, strings, null
- Logic: nested `all`/`any`/`!`
- Data: `get` deep vs missing key, `has`, `coalesce` with nulls
- Type coercion: `to-number` on string/null, `typeof` on each value type
- String: `concat`, `downcase`, `upcase`, `slice`, `index-of`
- Math: all operators including edge cases (div by zero → null, not panic)
- `case`, `match`, `step` with defaults
- `geometry-type`, `id`
- `in` / `!in` membership
- Round-trip: `parse(serialize(expr))` equals original
- Fuzz: arbitrary JSON array never panics, only `Ok` or `Err`

---

## libsphere Changes

### 1. Unified Error Type (`src/error.rs`)

Replace all per-module error enums (which discard source context) with:

```rust
#[derive(Debug, thiserror::Error)]
pub enum SphereError {
    #[error("I/O error reading {path}: {source}")]
    Io { path: String, #[source] source: std::io::Error },
    #[error("GeoJSON parse error in {path}: {source}")]
    GeoJson { path: String, source: geojson::Error },
    #[error("CSV parse error in {path}: {source}")]
    Csv { path: String, source: csv::Error },
    #[error("Shape error in {path}: {detail}")]
    Shape { path: String, detail: String },
    #[error("Source not found: {id}")]
    NotFound { id: String },
    #[error("Format does not support this operation: {format}")]
    UnsupportedFormat { format: String },
    #[error("Expression error: {0}")]
    Expression(#[from] libexpression::ExprError),
}

pub type Result<T> = std::result::Result<T, SphereError>;
```

Helper trait so each module can attach path context without boilerplate:
```rust
trait WithPath<T> {
    fn with_path(self, path: &str) -> Result<T>;
}
```

Tauri commands convert at IPC boundary: `.map_err(|e| e.to_string())`.

**Future CRS/transform errors** slot in as new variants without changing the enum's public contract.

### 2. In-Memory Feature Store with Spatial Index

New `src/store.rs` and `src/index.rs`.

**Spatial index trait** — designed so a SQLite R*Tree impl can be added later without changing call sites:

```rust
pub type Bbox = (f64, f64, f64, f64);  // (west, south, east, north)

pub trait SpatialIndex: Send + Sync {
    /// Insert a feature by its index in the feature vec and its bbox.
    fn insert(&mut self, idx: usize, bbox: Bbox);
    /// Return feature indices whose bbox intersects the query bbox.
    fn query_bbox(&self, bbox: Bbox) -> Vec<usize>;
}

pub struct RstarIndex { /* rstar::RTree<IndexEntry> */ }
impl SpatialIndex for RstarIndex { ... }

// Future: pub struct SqliteIndex { ... }
// impl SpatialIndex for SqliteIndex { ... }
```

**Feature store:**

```rust
pub struct FeatureStore {
    features: Vec<geojson::Feature>,
    index: Box<dyn SpatialIndex>,
    schema: SourceSchema,
}

impl FeatureStore {
    pub fn from_features(features: Vec<geojson::Feature>) -> Self;

    /// Paginated query with optional MapLibre expression filter.
    /// Returns features, total matching count, page metadata.
    pub fn query_page(
        &self,
        offset: u64,
        limit: u64,
        filter: Option<&libexpression::Expr>,
        sort_column: Option<&str>,
        sort_asc: bool,
    ) -> PageResult;

    pub fn feature_count(&self) -> u64;
    pub fn get_bounds(&self) -> Option<Bbox>;
    pub fn schema(&self) -> &SourceSchema;
}
```

**`SourceStorage`** is extended to hold an optional `FeatureStore` per source:

```rust
pub struct SourceEntry {
    pub source: Source,
    pub store: Option<FeatureStore>,  // None for MBTiles (tile-based, no features)
}

pub struct SourceStorage {
    pub store: Mutex<HashMap<String, SourceEntry>>,
}
```

When `source_add` is called, the Rust backend reads the file into a `FeatureStore` and stores it in `SourceEntry`. MapLibre then fetches the full GeoJSON via `source_get` (unchanged), but the PropertiesTable uses `source_query_page` which reads from the cached `FeatureStore` without re-reading disk.

### 3. New Tauri Commands

| Command | Signature | Description |
|---------|-----------|-------------|
| `source_query_page` | `(id, offset, limit, sort_column?, sort_asc?, filter_json?) -> PageResult` | Paginated attribute table with optional expression filter |
| `source_get_column_stats` | `(id, column) -> ColumnStats` | Histogram + min/max/mean for one column (replaces client-side stats) |

```rust
#[derive(Serialize)]
pub struct PageResult {
    pub features: Vec<serde_json::Value>,  // GeoJSON Feature objects
    pub total_matching: u64,
    pub offset: u64,
    pub limit: u64,
}

#[derive(Serialize)]
pub struct ColumnStats {
    pub column: String,
    pub col_type: String,
    pub count: u64,
    pub null_count: u64,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub mean: Option<f64>,
    pub histogram: Option<Vec<HistogramBin>>,
    pub unique_count: Option<u64>,
    pub top_values: Option<Vec<(String, u64)>>,
}
```

---

## Frontend Changes

### Redux source slice simplification

**Remove** `dataset?: GeoJSON.FeatureCollection` from source state. MapLibre already holds its own copy of the data internally. Storing it in Redux doubles memory for no benefit — the frontend never reads `source.dataset` for rendering (MapLibre does), and the PropertiesTable will now fetch via `source_query_page`.

**Keep** in Redux source state: `id`, `name`, `location`, `type`, `meta` (schema columns/counts), `pending`, `fractionIndex`, `editable`, `tilejson` (MVT sources).

**After `source_add`:**
1. Call `source_add` → get `{id, name, location, source_type}`
2. Call `source_get_schema` → get column schema
3. Dispatch `addSource` with metadata only — no GeoJSON payload in Redux
4. MapLibre source uses `source_get` result directly (as before), but it's no longer stored in state

**`showProperties` / PropertiesTable:**
- Open properties window with source `id` and schema
- `PropertiesTable` calls `source_query_page` with current page/sort/filter state
- Column header stats (histogram, min/max) fetched once via `source_get_column_stats`
- Remove client-side histogram/stats computation from TypeScript

### Layer filter input

Each layer in the left sidebar gets a collapsible filter section with:
- A text input accepting a MapLibre expression (e.g. `["==", ["get", "country"], "France"]`)
- Real-time validation: call `source_query_page` with the expression; if parse fails (caught in Rust), show inline error
- On valid expression: apply to the MapLibre layer via `map.setFilter(layerId, expr)`
- Store the filter expression in Redux `layer` state (as `serde_json::Value` / `JsonValue`)
- When the PropertiesTable is open for a filtered layer, pass the same filter expression to `source_query_page`

Filter state in Redux layer:
```ts
type LayerFilter = {
    expression: unknown[] | null   // null = no filter
    error: string | null
}
```

---

## Phased Delivery

### Milestone 1 — Backend Foundation

**Deliver:**
- `crates/libexpression/` crate with all operators and comprehensive tests
- `SphereError` unified error type in libsphere
- `src/index.rs`: `SpatialIndex` trait + `RstarIndex` impl
- `src/store.rs`: `FeatureStore` with `query_page`
- `SourceStorage` → `SourceEntry` with optional `FeatureStore`
- `source_query_page` and `source_get_column_stats` Tauri commands
- Update `libsphere/Cargo.toml`: add `thiserror`, `rstar`, `libexpression` (path dep)

**Acceptance test:**
- All existing tests pass
- `cargo build -p libexpression` with no libsphere/Tauri deps
- `source_query_page` on the airports GeoJSON fixture returns page 0 (50 features) in < 50ms
- `["==", ["get", "type"], "airport"]` filter applied via `source_query_page` returns correct subset
- All `libexpression` tests pass including round-trip

**Frontend:** No changes yet.

---

### Milestone 2 — Redux Simplification & Paginated Attributes

**Deliver:**
- Remove `dataset` from Redux source state
- Update `addFromUrl.ts`: after `source_add`, do not call `source_get` and store GeoJSON in Redux; MapLibre continues to use `source_get` result to set its own source data, but that result is not persisted in Redux
- Update `showProperties.ts`: open window with id + schema only
- Update `PropertiesTable`: replace full dataset with `source_query_page` pagination (keep tanstack/react-table for column render logic)
- Column header stats loaded from `source_get_column_stats` on window open

**Acceptance test:**
- Redux DevTools shows no `dataset` field on any source after adding a GeoJSON file
- PropertiesTable shows correct data with sort/page working
- Memory usage (Chrome DevTools heap snapshot) for a 50MB GeoJSON file is roughly halved vs before

---

### Milestone 3 — Layer Filter UI

**Deliver:**
- Filter expression input in Layer panel (left sidebar, per layer)
- Input validates on change: send to Rust `source_query_page` with filter; surface parse error inline
- Valid filter applied to MapLibre layer via `map.setFilter()`
- Filter stored in Redux layer state
- PropertiesTable respects layer filter: if the source has an active layer filter, pass it to `source_query_page`
- Filter cleared via a clear button; empty string = no filter

**Acceptance test:**
- Typing `["==", ["get", "type"], "small_airport"]` in an airport layer filter shows only small airports on map
- PropertiesTable opened for that layer shows only matching rows (same filter applied)
- Invalid expression (e.g. `["unknownOp"]`) shows inline error without crashing
- Filter expression survives layer panel toggle (stored in Redux)

---

## Critical Files

| File | Role |
|------|------|
| `crates/libexpression/src/` | New crate — implement from scratch |
| `crates/libsphere/src/error.rs` | New — replace all per-module errors |
| `crates/libsphere/src/index.rs` | New — `SpatialIndex` trait + rstar impl |
| `crates/libsphere/src/store.rs` | New — `FeatureStore`, `query_page` |
| `src-tauri/src/state.rs` | Extend `SourceStorage` → `SourceEntry` |
| `src-tauri/src/commands/source.rs` | Add new commands |
| `src/store/source/index.ts` | Remove `dataset` from Redux state |
| `src/store/source/addFromUrl.ts` | Drop Redux GeoJSON storage |
| `src/store/source/showProperties.ts` | Remove data payload from window open |
| `src/ui/PropertiesTable/index.tsx` | Switch to paginated IPC calls |
| `src/components/LeftSidebar/` | Add filter input to layer section |

## Workspace Cargo.toml Note

`src-tauri` currently has no shared workspace `Cargo.toml`. When adding `libexpression` as a path dependency, add it to `crates/libsphere/Cargo.toml` and declare the workspace properly so `libexpression` is listed as a workspace member. This avoids redundant `Cargo.lock` files.

---

## Tasks

### Task 1: Create libexpression crate
- [x] Create crates/libexpression/Cargo.toml with serde_json dependency
- [x] Create ExprError type in src/error.rs
- [x] Create EvalContext struct in src/context.rs
- [x] Create Expression trait and Expr type alias in src/expr.rs
- [x] Implement Literal expression
- [x] Implement data access: Get, Has, Id, GeometryType
- [x] Implement comparison operators: Eq, Ne, Lt, Lte, Gt, Gte
- [x] Implement logic operators: All, Any, Not
- [x] Implement type coercion: ToNumber, ToString, TypeOf, ToBoolean
- [x] Implement string operators: Concat, Downcase, Upcase, Slice, IndexOf, Length
- [x] Implement math operators: Add, Sub, Mul, Div, Mod, Pow, Abs, Ceil, Floor, Round, Sqrt, Ln, Log2, Log10, Min, Max
- [x] Implement control flow: Case, Match, Step, Coalesce
- [x] Implement membership: In
- [x] Implement parse() dispatcher in lib.rs
- [x] Write comprehensive tests covering all operators
- [x] Add libexpression to crates workspace

### Task 2: Unified SphereError type in libsphere
- [x] Add thiserror dependency to libsphere Cargo.toml
- [x] Create crates/libsphere/src/error.rs with SphereError enum
- [x] Implement WithPath helper trait
- [x] Update geojson.rs to use SphereError
- [x] Update csv.rs to use SphereError
- [x] Update shape.rs to use SphereError
- [x] Update gpx.rs to use SphereError
- [x] Update mbtiles.rs to use SphereError
- [x] Update lib.rs to export the error type

### Task 3: FeatureStore and SpatialIndex in libsphere
- [x] Add rstar and libexpression dependencies to libsphere Cargo.toml
- [x] Create crates/libsphere/src/index.rs with SpatialIndex trait and RstarIndex impl
- [x] Create crates/libsphere/src/store.rs with FeatureStore struct
- [x] Implement FeatureStore::from_features() with index building
- [x] Implement FeatureStore::query_page() with optional filter and sort
- [x] Implement FeatureStore::feature_count(), get_bounds(), schema()
- [x] Export from libsphere lib.rs
- [x] Write tests for FeatureStore query_page

### Task 4: SourceStorage extension and new Tauri commands
- [x] Extend src-tauri/src/state.rs: add SourceEntry wrapping Source + Option<FeatureStore>
- [x] Update SourceStorage to use SourceEntry
- [x] Update source_add command to build FeatureStore and store in SourceEntry
- [x] Add source_query_page Tauri command (id, offset, limit, sort_column?, sort_asc?, filter_json?)
- [x] Add source_get_column_stats Tauri command (id, column)
- [x] Update existing commands to work with new SourceEntry structure
- [x] Register new commands in main.rs
