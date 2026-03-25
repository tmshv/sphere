# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sphere is a geospatial data visualization and editing desktop application built with Tauri (Rust backend) and React/TypeScript (frontend) using MapLibre GL for map rendering. It supports loading GeoJSON, Shapefile, CSV, GPX, and MBTiles formats.

## Git Conventions

- Branch names use the format `issue-XX` (e.g. `issue-79`)
- Commit messages are single-line
- PR descriptions contain only a short summary of what was done (no test plan section)

## Build & Development Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server (port 1420)
npm run build            # Build frontend (tsc && vite build)
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm test                 # Run Vitest tests
npm run coverage         # Test coverage report

# Tauri (full app)
npm run tauri dev        # Run app in development mode
npm run tauri build      # Build production app

# Versioning
npm version patch         # Bump version in package.json, tauri.conf.json, Cargo.toml, and Cargo.lock
```

## Testing Policy

Before modifying any code file, check whether it has tests. All code must be covered by tests before making changes. If tests are missing, write them first, then implement the change.

## Formatting

Run `npm run format` after every code modification.

## Code Style

- Double quotes, no semicolons, 4-space indentation
- Trailing commas in multiline structures
- Unix line endings
- No `_underscore` prefix for private/local variables
- Use `function Component({ prop }: ComponentProps) {}` syntax for React components, not arrow functions
- Use maplibre types (`MapEventType`, `MapLayerEventType`, `Listener`, etc.) when working with map event handlers

## Forbidden Patterns

The following code smells are strictly forbidden:

- **Out-of-bounds index access** — never rely on `arr[i]` returning `undefined` when `i` is out of range. Use `.at()` with bounds-safe logic, `.slice()`, or `.filter()` to produce a range before indexing.
- **Non-null assertions (`!`)** — never use `foo!` to silence TypeScript. Narrow the type explicitly with a guard or early return instead.
- **Untyped `as` casts** — never cast with `as SomeType` to suppress type errors. Fix the type mismatch at its source.
- **`any` type** — never use `any`. Use `unknown` with a type guard, or a proper interface/union.
- **Magic numbers and strings** — inline literals with no explanation (e.g. `* 0.0174533`, `status === 2`) must be replaced with named constants or enums.
- **Nested ternaries** — more than one level of `? :` nesting is forbidden. Use `if/else` or a lookup table instead.
- **`console.log` left in code** — debug logging must be removed before committing.
- **Ignoring returned errors** — never discard a `Promise` without `.catch()` or `await` in an async context. Never silently swallow errors in `catch (e) {}`.

## Architecture

### Frontend (`src/`)

**State Management**: Redux Toolkit with listener middleware for side effects. Key slices:
- `app` - UI state (dark theme, sidebar visibility, active sidebar tab, map tool mode (`"pan"` | `"select"`))
- `layer` - Layer management and styling
- `source` - Data source management
- `selection` - Selected map features. `selectOne` sets `layerId`, clears `sourceId`; `selectMany` sets `sourceId`, clears `layerId` — mutually exclusive, and `useFeatureState` depends on this invariant
- `draw` - Drawing mode state
- `map` / `mapStyle` / `projection` - Map viewport and rendering

**Component Structure**:
- `components/SphereMap/` - Map rendering with react-map-gl/MapLibre
  - `SourcePreviewLayer` - Renders geometry-typed preview layers (point/line/polygon) for the selected source when the Sources tab is active. Points layer components directly at the already-mounted MapLibre source (no duplicate source created). For GeoJSON/FeatureCollection sources, renders one set of `PointLayer`/`SphereLineStringLayer`/`SpherePolygonLayer` using `preview-${sourceId}-{geometry}` layer IDs. For MVT sources, iterates `source.sourceLayers` and renders all three components per named vector layer using `preview-${sourceId}-${sl.id}-{geometry}` IDs. Passes `selectPreviewLayerIds` result to `useFeatureProperties` (empty array when no preview active, which deactivates feature property lookup to prevent properties slice conflicts). `selectPreviewLayerIds` (in `store/selectors.ts`) is the single authoritative source of which layers are clickable during preview — used by both `SourcePreviewLayer` and `useFeatureSelect`
  - `map-body.tsx` `selectLayers` - suppresses user layers only during draw mode; tab state must NOT gate layer visibility (doing so was a v0.13.0 regression that hid user layers on the Sources tab)
  - `MapToolbar` - Floating Pan/Rect-Select toggle, visible on Sources tab only. Resets to `"pan"` whenever the user leaves the Sources tab (to avoid leaving `dragPan` disabled). Escape key also resets to pan
  - `RectSelectOverlay` - Transparent overlay that captures mouse drag when `mapTool === "select"`. Drag left-to-right = `"include"` mode (solid border); right-to-left = `"intersect"` mode (dashed border). Calls `source_query_rect` and dispatches `selectMany`. Requires `selectors.selection.currentSourceId` to be set (set by `selectMany`; absent when `selectOne` used)
- `components/LeftSidebar/` - Sources and layers management
- `store/effects/` - Side effects (file loading, etc.)
- `ui/` - Reusable UI components (built on Mantine)

**Hooks** (`src/hooks/`):
- `useFeatureClick` - Registers MapLibre click handlers; `layerId` accepts `string[]` so multiple layers (e.g. preview point/line/polygon layers) share one outside-click clear

**Sphere Hooks** (`src/sphere-hooks/`):
- `useFeatureState` - Drives MapLibre `setFeatureState({ selected: true })` for all `selectedIds` in the selection slice. Resolves the MapLibre source ID from `layerId` (via `layer.items`) for single-feature selections, or from `selectionSourceId` directly for multi-select (`selectMany`). Requires `promoteId="id"` on the source (set by `SphereSource`). Clears previous highlights via `removeFeatureState` before applying new ones
- `useFeatureSelect` - No-op in pan tool mode; in select tool mode registers a click handler that dispatches `selectOne` for numeric feature IDs or `resetFeature` for clicks on empty space

### Backend (`src-tauri/`)

Tauri app with async Rust backend (Tokio). Commands in `src/commands/`:
- `source.rs` - Load sources, get GeoJSON, schema, bounds, MBTiles tiles, paginated feature queries, column statistics, rect spatial queries
- `system.rs` - System utilities (show in finder)

State stored in `SourceStorage` (thread-safe `HashMap<String, SourceEntry>` with Mutex). Each `SourceEntry` holds a `Source` and an optional `FeatureStore` (built at load time; absent for MBTiles sources).

### Rust Libraries (`crates/`)

- `libsphere` - Geospatial processing (format parsing, bounds calculation)
- `libexpression` - MapLibre Style Specification filter expression parser and evaluator
- `mbtiles` - MBTiles tile database reader
- `tilejson` - TileJSON spec support

### Data Flow

1. Files loaded via Tauri dialog → processed in Rust (`add-file.ts` effect)
2. Sources stored in `SourceStorage`, sent to frontend as GeoJSON
3. Redux state drives React rendering → MapLibre renders layers

## Key Dependencies

- **Frontend**: React 18, Redux Toolkit, react-map-gl 8, MapLibre GL 5, Mantine 5, Turf.js
- **Backend**: Tauri 2.9, rusqlite (bundled SQLite), geo/geojson/geozero/wkt crates

## Runtime Requirements

- Node 22 (managed via Mise)
- Rust 1.92

## Tauri Integration Patterns

**IPC Communication**: Frontend invokes Rust commands via `@tauri-apps/api` `invoke()` function.

**Custom Protocols**: The app registers custom URL protocols for accessing sources:
- `sphere://source{path}` - Access loaded geospatial sources
- `sphere://mbtiles{path}` - Access MBTiles tile data

**CSV source URI params**: When loading CSV files, the `sphere://source` URI accepts query parameters: `?x=<field>&y=<field>` for lon/lat column names (defaults: `lng`/`lat`), `?wkt=<field>` for a WKT geometry column. When a source is stored, features are assigned integer IDs starting from 1 (after the max existing numeric ID). Original string IDs are preserved in `properties["$id"]`.

**Event System**: Tauri events handle:
- Theme changes (system dark/light mode)
- Drag-and-drop file handling
- Inter-window events for the properties table window:
  - `properties-set` — main → properties window: sets source, schema, filter expression
  - `properties-init` — properties window → main: signals window is ready
  - `properties-selection-changed` — main → properties window: `{ sourceId, selectedIds }` emitted on every `selectOne`/`selectMany` to drive the All/Selected filter toggle

**Plugins Used**: fs, dialog, http, clipboard

## IPC Commands

Available Tauri commands (invoked from frontend via `invoke()`):

| Command | Description |
|---------|-------------|
| `source_add`              | Load a source from URL/path |
| `source_get`              | Get source as GeoJSON string |
| `source_bounds`           | Get geographic bounds [west, south, east, north] |
| `source_get_schema`       | Get property schema: `{ columns: Record<string,string>, points_count, lines_count, polygons_count }` |
| `source_query_page`       | Paginated attribute query with optional MapLibre expression filter: `(id, offset, limit, sort_column?, sort_asc?, filter_json?) -> PageResult` |
| `source_get_column_stats` | Histogram + min/max/mean/unique counts for one column: `(id, column) -> ColumnStats` |
| `source_query_rect`       | Rect spatial query: `(id, bbox: [west,south,east,north], mode: "include"\|"intersect") -> Vec<i64>` |
| `mbtiles_get_tile`        | Get single tile from MBTiles |
| `mbtiles_get_metadata`    | Get MBTiles metadata/TileJSON |
| `show_in_finder`          | Open file location in system explorer |

## UX Principles

- **Honest empty state** — never fake state or show placeholders that imply data exists. If a filter (e.g. "Selected" in the attribute table) yields no results because nothing is selected, show an empty table. Do not hide the control or substitute a message that obscures the real state.

## Known Issues / Technical Debt

1. **Error handling** - `libsphere` errors now carry path context via `SphereError`; `src-tauri` commands still convert errors to strings at the IPC boundary, discarding structure
2. **Unsafe unwraps** - URL parsing and UTF-8 conversion use `.unwrap()` which can panic
3. **Fake async** - Some commands marked `async` but perform blocking I/O
4. **Memory leaks** - Event listeners in `src/tauri.ts` don't store unlisten functions for cleanup
5. **Missing plugin** - `tauri_plugin_shell` in Cargo.toml but not registered in main.rs
6. **CSP disabled** - `tauri.conf.json` has `"csp": null` (security concern for production)
7. **No type sharing** - TypeScript and Rust types are duplicated and can drift out of sync
8. **Busy-wait polling** - `waitEvent()` in `src/lib/tauri.ts` uses inefficient polling loop
