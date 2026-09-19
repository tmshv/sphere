# Source panel: per-format attribute inspection

## Problem

The Sources tab source panel (`apps/sphere/src/components/SourcePanel/index.tsx`) shows a flat
list of badges: source type, a hardcoded `SIZE:0`, the location string, and three geometry
counts. It is identical for every kind of source, it exposes nothing about the attribute
schema, and it says nothing about the values inside those attributes.

Two capabilities are missing:

1. **Inspection.** For a selected source there is no way to see which fields exist, what type
   each field holds, or how its values are distributed, without opening the separate properties
   window.
2. **CSV geometry control.** The backend already supports reading CSV geometry either from a
   WKT column or from an x/y column pair (`crates/libsphere/src/csv.rs`), configured through
   `sphere://` URI query parameters at load time. There is no UI for it, so the mode is chosen
   once, automatically, with a silent fallback to columns named `lng`/`lat`. A CSV without those
   columns loads as a source with zero features and no explanation.

## Goals

- Replace the single panel with one panel per source format, each showing the facts that matter
  for that format.
- Show, for every feature-based source, a geometry-type breakdown and an attribute schema with
  a per-field value summary — histograms for numeric fields, top values for string fields.
- Give CSV sources a control for choosing the geometry mode and its columns, applied in place.
- Keep the panel read-only apart from the source name and the CSV geometry control.

## Non-goals

- Value statistics for tile sources. Vector and raster tiles have no feature store to scan;
  their panels show TileJSON metadata only.
- Editing attribute values, renaming fields, or changing field types.
- Reprojection, CRS conversion, or any other data transformation.
- Changing how the separate properties window works, beyond it receiving the extra geometry
  counts for free.

## Decisions

| Question                        | Decision                                                                 |
|---------------------------------|--------------------------------------------------------------------------|
| Panel placement                 | Left sidebar, inside the existing Sources tab accordion                   |
| Stats trigger                   | All columns start on source select, computed on a backend thread, filled in progressively |
| CSV apply semantics             | Re-parse in place, keeping the same source id                             |
| Tile source scope               | TileJSON metadata only                                                    |
| Misconfigured CSV               | Loads anyway; the panel shows the problem and lets the user fix it        |
| Geometry counts                 | Three buckets (points / lines / polygons), each with a `Multi-` sub-count |
| Name field                      | Stays editable                                                            |
| String value summary            | Compact list, count only                                                  |
| Top-N limit                     | A command parameter, defaulting to a named constant                       |
| Format discriminator            | A `format` field on `GeojsonSource`, not a wider `SourceType` enum        |
| Panel composition               | A separate panel per format, sharing only leaf presentational primitives  |

## Data model

### `SourceFormat`

`src/types/index.ts` gains a union type — not a TS enum, because `src/types/` is types-only and
an enum emits runtime code:

```ts
export type SourceFormat = "geojson" | "csv" | "shapefile" | "gpx"
```

The runtime half lives in `src/lib/source-format.ts`, following the `src/lib/` ↔ `src/types/`
same-name convention:

```ts
const SOURCE_FORMATS = new Set<string>(["geojson", "csv", "shapefile", "gpx"])

export function isSourceFormat(value: string): value is SourceFormat {
    return SOURCE_FORMATS.has(value)
}
```

`GeojsonSource` gains `format: SourceFormat`. `addFromUrl.ts` currently destructures only
`{ id, location, name }` from the `source_add` result and discards the `source_type` the backend
already returns; it now reads `source_type`, narrows it with `isSourceFormat`, and falls back to
`"geojson"` for anything unrecognized. The backend reports `"geojson"` for `Geojson`,
`GeojsonSeq`, and `InMemory` alike.

`FeatureCollecionSource` gets no `format` field — an in-memory feature collection is
geojson-shaped by construction.

`SourceType` and `LayerType` stay as they are. Converting them away from TS enums is unrelated
churn and is out of scope.

### Panel dispatch

| Source state                                       | Panel                    |
|----------------------------------------------------|--------------------------|
| `type: Geojson`, `format: "geojson"`               | `GeojsonSourcePanel`     |
| `type: Geojson`, `format: "csv"`                   | `CsvSourcePanel`         |
| `type: Geojson`, `format: "shapefile"`             | `ShapefileSourcePanel`   |
| `type: Geojson`, `format: "gpx"`                   | `GpxSourcePanel`         |
| `type: FeatureCollection`                          | `GeojsonSourcePanel`     |
| `type: MVT`, non-raster tile format                | `VectorTilesSourcePanel` |
| `type: MVT`, raster tile format, or `type: Raster` | `RasterTilesSourcePanel` |

The last row matters: `addFromUrl` creates `SourceType.MVT` for every `.mbtiles` file regardless
of its tile format, so raster MBTiles arrive as MVT sources. The existing `isRasterTileFormat`
helper in `src/lib/tilejson.ts` is the single source of truth for that test and is reused, not
reimplemented.

### Geometry counts

`SourceSchema` in `crates/libsphere/src/schema.rs` gains six fields. The three existing
`*_count` fields keep their current meaning as **inclusive totals**; the new `multi_*` fields are
the subset of those totals that are `Multi-` variants.

| Field                  | Meaning                                                    |
|------------------------|------------------------------------------------------------|
| `points_count`         | `Point` + `MultiPoint` features (unchanged)                |
| `multi_points_count`   | of those, how many are `MultiPoint`                        |
| `lines_count`          | `LineString` + `MultiLineString` features (unchanged)      |
| `multi_lines_count`    | of those, how many are `MultiLineString`                   |
| `polygons_count`       | `Polygon` + `MultiPolygon` features (unchanged)            |
| `multi_polygons_count` | of those, how many are `MultiPolygon`                      |
| `collections_count`    | `GeometryCollection` features                              |
| `null_geometry_count`  | features with no geometry                                  |
| `features_count`       | total features                                             |

`SourceMetadata` in `src/types/index.ts` mirrors these. The properties window consumes
`SourceMetadata` and receives the extra fields without any behavior change.

## Backend

### Changed: `source_get_schema`

Returns the extended `SourceSchema`. No signature change.

### Changed: `source_get_column_stats`

```
source_get_column_stats(id, column, ids?, top_n?) -> ColumnStats
```

- New optional `top_n`, defaulting to a named `DEFAULT_TOP_VALUES = 10`.
- `build_histogram`'s hardcoded `10` becomes a named `HISTOGRAM_BINS` constant. Both are magic
  numbers today, which CLAUDE.md forbids.
- The scan moves inside `tokio::task::spawn_blocking`. The command is declared `async` today but
  blocks the runtime (known issue #3, "fake async"). The `Arc<FeatureStore>` is already cloned
  out of the mutex before the work begins, so moving the loop onto a blocking thread is a small,
  contained change — and it is what makes "computed on a background thread, shown when ready"
  true rather than aspirational.

### Changed: `Csv::get_features`

Today the loop silently drops any row whose geometry fails to parse. This is exactly the failure
a misconfigured CSV produces, so it must be counted instead of hidden.

```rust
pub struct CsvReadResult {
    pub features: Vec<Feature>,
    pub skipped: u64,
}

impl Csv {
    pub fn read(&self) -> Result<CsvReadResult> { ... }
    pub fn get_features(&self) -> Result<Vec<Feature>> { Ok(self.read()?.features) }
}
```

`to_geojson`, `get_schema`, and `get_bounds` continue to call `get_features` and are unchanged.

### New: `source_get_info`

One call per source selection, returning the file facts, the shared schema, and a serde-tagged
payload of whatever is unique to the format.

```rust
struct SourceInfo {
    file: Option<FileInfo>,   // size_bytes, modified; None for non-file sources
    schema: SourceSchema,     // columns and all geometry counts
    details: FormatDetails,   // only what is unique to this format
}

struct FileInfo {
    size_bytes: u64,
    modified: Option<String>,  // RFC 3339
}

#[serde(tag = "format", rename_all = "lowercase")]
enum FormatDetails {
    Geojson,
    Csv {
        mode: CsvMode,                  // "xy" | "wkt"
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
        crs: Option<String>,            // read from .prj when present
    },
    Gpx {
        waypoints: u64,
        tracks: u64,
        routes: u64,
        track_points: u64,
    },
}
```

`FormatDetails::Geojson` carries no fields on purpose: geometry counts and the attribute schema
are not format-specific and live in `schema`, alongside it. GeoJSON has nothing beyond the
shared facts.

`header_columns` is read directly from the CSV header row, independent of what parsed
successfully, so the geometry pickers are populated even when zero rows yielded geometry.

Tile sources do not use this command. The vector and raster panels read `source.tilejson`, which
is already in Redux from load time.

New supporting code:

- `crates/libsphere/src/csv.rs` — a header-only read for `header_columns`.
- `crates/libsphere/src/shape.rs` — sidecar detection and `.prj` reading.
- `crates/libsphere/src/gpx.rs` — waypoint / track / route / track-point counts.

### New: `source_set_csv_geometry`

```
source_set_csv_geometry(id, mode, columns) -> SourceSchema
```

Locks the source storage, matches `SourceData::Csv`, replaces its `CsvGeometry`, rebuilds the
`FeatureStore`, and returns the fresh schema. The source `id` is a digest of the original URL
and is not recomputed, so layers, styles, and the outline entry all survive.

Rejects, with an error the frontend surfaces through the existing `fail` listener:

- a non-CSV source id,
- WKT mode together with x/y columns — the same conflict `CsvParams::from_uri` already rejects,
- an incomplete selection (x without y, or WKT mode with no column).

Two consequences follow from re-parsing in place, and both are handled rather than ignored:

1. **Feature ids change.** The rebuilt store reassigns ids from 1, so an existing selection now
   points at different features. The calling listener clears the selection.
2. **The map does not refresh on its own.** `SphereSource` fetches `Geojson` data once on mount;
   only `FeatureCollection` sources carry the `version` cache-bust field. `GeojsonSource`
   therefore gains the same `version: number` field, and `SphereSource` watches it for both
   types — reusing the existing `bumpVersion` pattern rather than adding a second mechanism.

## Frontend state

One new slice, `store/sourceInfo/`, holding two server-derived caches keyed by source id:

```ts
type LoadStatus = "pending" | "ready" | "error"

type SourceInfoState = {
    info: Record<Id, { status: LoadStatus; file?: FileInfo; details?: FormatDetails }>
    stats: Record<Id, Record<string, { status: LoadStatus; data?: ColumnStats }>>
}
```

One listener, `store/listeners/load-source-info.ts`, triggered by `source.select`:

1. `listenerApi.cancelActiveListeners()` aborts in-flight work for the previously selected
   source, so switching sources quickly leaves no stale scans running.
2. Invoke `source_get_info` and store the result.
3. Walk the schema's columns **sequentially**, invoking `source_get_column_stats` per column and
   dispatching each result as it lands. `listenerApi.signal.aborted` is checked between columns
   so cancellation is real. Sequential rather than parallel: each call is a full scan of the
   feature store, so firing fifty at once would saturate the blocking pool without improving
   time-to-first-result — and time-to-first-result is the point.
4. Columns already cached for that source are skipped, making re-selection instant.

Invalidation is dispatched from three places: `source.removeSource`, the `save-draw` listener
(drawing changes the data), and the CSV re-parse listener below.

All display shaping happens in `createSelector`. `selectCurrentSourceFields` joins
`meta.columns` (name → type) with the stats cache into a sorted array of
`{ name, type, status, summary }`. Components read that array and render it; they compute
nothing, per the project's state-management principles.

## Components

```
components/SourcePanel/
    index.tsx                    ActionBar + Name input + format dispatch
    GeojsonSourcePanel.tsx
    CsvSourcePanel.tsx
    ShapefileSourcePanel.tsx
    GpxSourcePanel.tsx
    VectorTilesSourcePanel.tsx
    RasterTilesSourcePanel.tsx
    CsvGeometryConfig.tsx
    parts/
        InfoRow.tsx              label → value row
        FieldRow.tsx             field name, type badge, null count, summary slot
        NumericSummary.tsx       sparkline histogram, min / max / mean
        StringSummary.tsx        "N unique" plus top values, count only
        BoolSummary.tsx          true / false / null counts
```

Each format owns its panel file and decides its own sections and order. There are no shared
section blocks. The leaves under `parts/` are shared, app-local, and purely presentational —
they take props and render, so the histogram is written once without coupling the panels'
layouts. They stay in the app rather than moving to `@sphere/ui`; `@sphere/ui` and
`@sphere/utils` are untouched by this work and stay at `0.0.0`.

`index.tsx` keeps only what is not a section: the action bar, the editable Name field, and the
dispatch. Everything below the Name belongs to the format panel.

| Panel        | Sections                                                                  |
|--------------|---------------------------------------------------------------------------|
| GeoJSON      | File · Geometry · Attributes                                              |
| CSV          | File · Geometry source · Parsing · Geometry · Attributes                  |
| Shapefile    | File · Sidecars & CRS · Geometry · Attributes                             |
| GPX          | File · GPX contents · Geometry · Attributes                               |
| Vector tiles | Tiles · Layers (per `vector_layer`: id, zoom range, fields + types)        |
| Raster tiles | Tiles (format, zoom range, bounds, center, attribution)                    |

`File` replaces today's hardcoded `SIZE:0` badge with the real size on disk and last-modified
time. `Geometry` renders the counts table from the schema. `Attributes` renders one `FieldRow`
per column.

The two tile panels have no `File` section: they never call `source_get_info`, which is where
file facts come from, because an MBTiles source has no feature store for that command to report
on. Their location is already shown in the panel chrome above.

A field row at sidebar width, before and after its stats arrive:

```
elevation      num                          region         str
  ▁▂▅█▆▃▂▁     min 12  max 1 843  mean 320     342 unique
                                               Moscow        1 204
name           str                            Kazan           812
  ⣀ loading                                   Sochi           402
                                              …339 more
```

### CSV geometry config

A `SegmentedControl` chooses between X/Y and WKT. X/Y mode shows two `Select`s, WKT mode one,
all populated from `header_columns` — the raw header, so the pickers work even when no row
parsed. An Apply button is disabled until the staged value both differs from what is applied and
is complete.

The staged pickers are local `useState` seeded from the applied values, with `key={sourceId}` on
the component so switching sources resets them. This is the `key`-to-reset pattern CLAUDE.md
calls for, rather than suppressing `useExhaustiveDependencies`.

The apply *logic* is a listener, not an event handler. The component dispatches
`applyCsvGeometry({ id, mode, columns })`; the listener:

1. invokes `source_set_csv_geometry` and receives the new schema,
2. dispatches `source.setGeojsonMeta` with the new counts,
3. dispatches `source.bumpVersion`, so `SphereSource` re-fetches,
4. clears the selection, because feature ids were reassigned,
5. invalidates the cached stats for that source, which re-triggers the stats listener,
6. on failure dispatches `fail` and leaves the staged config exactly as the user typed it.

Step 6 is required by the project's "never destroy user input silently" principle: a rejected
apply must not reset the pickers.

When the applied columns are absent from `header_columns` — the common case of a CSV that fell
back to the implicit `lng`/`lat` default and has neither — the panel shows them as applied *and*
flags them as missing, next to `0 of 5 000 rows had valid geometry`. That is the honest empty
state the project's UX principles require, rather than a silent guess or a hidden control.

## Testing

CLAUDE.md requires tests to exist before a file is modified. Current coverage of the files this
touches:

| File                                      | Tests today                     |
|-------------------------------------------|---------------------------------|
| `components/SourcePanel/index.tsx`        | yes — `index.test.ts`           |
| `store/source/index.ts`                   | yes — `index.test.ts`           |
| `lib/source-metadata.ts`                  | yes — `source-metadata.test.ts` |
| `crates/libsphere/src/csv.rs`             | yes                             |
| `crates/libsphere/src/schema.rs`          | yes                             |
| `store/source/addFromUrl.ts`              | none — write first              |
| `store/source/reload.ts`                  | none — write first              |
| `components/SphereMap/SphereSource.tsx`   | none — write first              |
| `src-tauri/src/commands/source.rs`        | none — write first              |

`src-tauri/src/commands/source.rs` has no test module at all. `commands/selection.rs` does, so
there is a pattern to follow, but covering the existing commands before extending
`source_get_schema` and `source_get_column_stats` is a real chunk of work that is not the
feature itself. It is in scope.

New code is tested as it is written:

- `isSourceFormat` — every valid format, and rejection of unknown strings.
- The `sourceInfo` reducer and its selectors, including the join of schema columns with
  partially-arrived stats.
- The `load-source-info` listener — progressive fill, cancellation on source switch, and
  cache-skip on re-selection.
- The `applyCsvGeometry` listener — success path, failure preserving staged input, and selection
  cleared on success.
- `Csv::read` — skipped-row counting, including the all-rows-skipped case.
- The extended `SourceSchema` counts, including `Multi-` sub-counts and null geometries.
- `source_set_csv_geometry` — happy path, WKT/xy conflict rejection, incomplete selection
  rejection, non-CSV source rejection.

Panels are presentational and read from selectors, so they get light render tests. The selectors
carry the logic and get real ones.

## Incidental fixes

Two problems sit directly in the code this work modifies. Both are fixed as part of it, because
the new geometry counts land in exactly these functions.

**Duplicated geometry counting.** `computeGeometryMeta` in `store/source/index.ts` and
`createSourceMetadataFromFeatureCollection` in `lib/source-metadata.ts` are the same function
written twice. Adding the `Multi-`, collection, null, and total counts would mean adding them
twice and keeping two copies in step. They collapse into the single `lib/source-metadata.ts`
implementation, which is where the project's directory convention puts a helper that operates on
a type from `src/types/`.

**Null geometry crash.** `createSourceMetadataFromFeatureCollection` reads `f.geometry.type`
without a guard. GeoJSON permits `"geometry": null`, so this throws on a feature collection that
contains one. Since `null_geometry_count` is now a counted concept, the guard is added and the
null branch does real work instead of crashing.

## Versioning

`crates/libsphere` goes `0.7.0` → `0.8.0`, once for the PR, followed by `cargo update -p
libsphere` from `src-tauri/`. `@sphere/ui` and `@sphere/utils` are untouched and stay at
`0.0.0`.

## Risks

- **In-place mutation of a file-backed source.** Re-parsing a CSV replaces a `SourceEntry`'s
  data under the storage mutex while the map may be mid-fetch. The existing lock discipline
  covers it, but this is the first command that replaces a non-in-memory source's data.
- **`version` on `GeojsonSource`.** This changes `SphereSource`'s fetch trigger for every GeoJSON
  source, not only CSVs. It is the same pattern `FeatureCollection` already uses, so the risk is
  regression rather than novelty — which is why `SphereSource` gets tests before it is touched.
- **Scan cost.** Stats scan the whole feature store once per column. On a very wide, very large
  source the tail columns will take noticeable time to fill in. Sequential and cancellable keeps
  this from being harmful, but it will not be instant.
