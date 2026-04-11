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
# Frontend development (delegated to workspaces)
npm run dev              # Start Vite dev server (port 1420)
npm run build            # Build frontend (tsc && vite build)
npm run lint             # Run Biome lint across all workspaces
npm run lint:fix         # Fix Biome lint issues
npm test                 # Run Vitest tests across all workspaces
npm run coverage         # Test coverage report

# Tauri (full app)
npm run tauri dev        # Run app in development mode
npm run tauri build      # Build production app

# Versioning
npm version patch -w @sphere/app  # Bump version in package.json, tauri.conf.json, Cargo.toml, and Cargo.lock
```

When modifying any file inside a `crates/<name>/` directory, bump the minor version of that crate in its `Cargo.toml` (e.g. `0.1.0` → `0.2.0`) and run `cargo update -p <name>` from the workspace root (`src-tauri/`) to update the lock file. Bump only once per PR, not per commit.

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
- **Lint suppression comments** — never use `biome-ignore`, `eslint-disable`, or similar suppression comments. Restructure the code so it satisfies the rule naturally (e.g. use `key` prop to reset component state instead of suppressing `useExhaustiveDependencies`, construct a new object instead of `delete`, derive a stable key instead of using array index).

## Architecture

### Frontend (`src/`)

**State Management**: Redux Toolkit with listener middleware for side effects. Key slices:
- `app` - UI state (dark theme, sidebar visibility, active sidebar tab, map tool mode (`"pan"` | `"select"`))
- `layer` - Layer management and styling
- `source` - Data source management; `FeatureCollecionSource` stores no GeoJSON in Redux — data lives in the Rust backend. A `version: number` field acts as a cache-bust signal: `bumpVersion(id)` increments it, which triggers `SphereSource` to re-fetch via `source_get` IPC.
- `selection` - Selected map features. `selectOne` sets `layerId`, clears `sourceId`; `selectMany` sets `sourceId`, clears `layerId` — mutually exclusive, and `useFeatureState` depends on this invariant
- `draw` - Drawing mode state (`sourceId`, `selectedIds: number[]`); `start` enters draw mode with optional selected feature IDs; `commit` carries `{ sourceId, patch: { added, updated, deleted_ids } }` and is handled by the `save-draw` listener; `done`/`reset` clear state
- `map` / `mapStyle` / `projection` - Map viewport and rendering
- `tools` - Active map tool state (`activeTool: Tool | null`); `"navigation"` = drag-pan/scroll-zoom/rotate enabled (default), `"draw"` = drawing mode active, `null` = map frozen; `reset` action returns to `"navigation"` and triggers the `resetTool` listener which clears draw state if needed
- `mapInteraction` - Fine-grained MapLibre handler toggles (`dragPan`, `scrollZoom`, `dragRotate`); combined with `tools` by `useMapNavigation`
- `settings` - User preferences (no UI yet). `copyWrapAsFeatureCollection: boolean` (default `true`) controls whether GeoJSON copy wraps features in a FeatureCollection; `copyWktSeparator: string` (default `"\n"`) is the separator between WKT geometries

**Component Structure**:
- `components/SphereMap/` - Map rendering with react-map-gl/MapLibre
  - `SphereSource` — Renders a MapLibre `<Source>` for each Redux source entry. For `FeatureCollection` sources, data is never stored in Redux; the component watches `version` from the source slice and fetches via `source_get` IPC whenever it increments. For `Geojson` sources, data is fetched once on mount via `source_get` IPC. The draw tool (`Draw.tsx`) loads features on mount via `source_get_slice` IPC when features are selected, or `source_get` IPC for all features (not from Redux state). It tracks MapLibre Draw create/update/delete/combine/uncombine events. On "Done", it dispatches `draw.commit` with a patch (`{ added, updated, deleted_ids }`); the `save-draw` listener calls `source_patch` IPC to persist incremental changes, dispatches `bumpVersion` to trigger `SphereSource` to re-fetch, then dispatches `draw.done` and `tools.reset`. If `source_patch` fails, draw mode stays active.
  - `SourcePreviewLayer` - Renders geometry-typed preview layers (point/line/polygon) for the selected source when the Sources tab is active. Points layer components directly at the already-mounted MapLibre source (no duplicate source created). For GeoJSON/FeatureCollection sources, renders one set of `PointLayer`/`SphereLineStringLayer`/`SpherePolygonLayer` using `preview-${sourceId}-{geometry}` layer IDs. For MVT sources, iterates `source.sourceLayers` and renders all three components per named vector layer using `preview-${sourceId}-${sl.id}-{geometry}` IDs. Passes `selectPreviewLayerIds` result to `useFeatureProperties` (empty array when no preview active, which deactivates feature property lookup to prevent properties slice conflicts). `selectPreviewLayerIds` (in `store/selectors.ts`) is the single authoritative source of which layers are clickable during preview — used by both `SourcePreviewLayer` and `useFeatureSelect`
  - `map-body.tsx` `selectLayers` - suppresses user layers during draw mode and when a source is actively previewed (`previewSourceId` defined); the v0.13.0 regression (hiding layers on source tab unconditionally) was fixed, but source-preview isolation (hiding layers when a specific source is selected for preview) is intentional
  - `MapToolbar` - Floating Pan/Rect-Select toggle, visible on Sources tab only. Resets to `"pan"` whenever the user leaves the Sources tab (to avoid leaving `dragPan` disabled). Escape key also resets to pan
  - `RectSelectOverlay` - Transparent overlay that captures mouse drag when `mapTool === "select"`. Drag left-to-right = `"include"` mode (solid border); right-to-left = `"intersect"` mode (dashed border). Calls `selection_rect` (single IPC call that spatially queries and mutates selection server-side, returning a delta) and emits the delta on the selection bus. Requires `selectors.selection.currentSourceId` to be set (set by `selectMany`; absent when `selectOne` used)
  - `SphereLayer` — The `select` selector reads both layer and source to determine filtering strategy per layer. For **MVT PBF** sources with a filter, the user's filter expression is passed as `userFilter` to geometry layer components (`PointLayer`, `SphereLineStringLayer`, `SpherePolygonLayer`), which combine it with their geometry-type filter via `combineFilters` (`["all", geometryFilter, userFilter]`). The source ID stays original — MapLibre applies the filter client-side on decoded vector tile features. For **GeoJSON/FeatureCollection** sources with a filter, the existing backend-filtered side-source approach is used (`sourceId` resolves to `layer-${layerId}`, `FilteredLayerSource` creates the side-source). `FilteredLayerSource` skips the backend IPC call for MVT PBF sources since filtering is handled by MapLibre natively.
- `components/LeftSidebar/` - Sources and layers management
- `store/effects/` - Side effects (file loading, etc.)
- `ui/` - Reusable UI components (built on Mantine)

**Directory conventions**:
- `src/types/` — TypeScript types and interfaces only. No runtime logic, no functions, no constants.
- `src/lib/` — Pure helper functions and utilities. If a function relates to a type from `src/types/`, put it in a same-named file here (e.g. `src/lib/tilejson.ts` for helpers that operate on `TileJSON`).

**Hooks** (`src/hooks/`):
- `useFeatureClick` - Registers MapLibre click handlers; `layerId` accepts `string[]` so multiple layers (e.g. preview point/line/polygon layers) share one outside-click clear
- `useMapNavigation` - Combines `selectors.mapInteraction` (dragPan/scrollZoom/dragRotate toggles) and `selectors.tools.selectNavigationEnabled` to sync MapLibre handler state with Redux

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

## Frontend Layering

The frontend is an npm workspaces monorepo. Packages depend only downward:

```
apps/sphere  ->  @sphere/ui  ->  @sphere/utils
```

- `@sphere/utils` (`packages/utils/`) — pure TS helpers. No React, no maplibre, no Tauri, no Redux, no domain types. Each package exposes a single barrel: `import { lerp, deduplicate } from "@sphere/utils"`. Public surface is declared in `packages/utils/src/index.ts`.
- `@sphere/ui` (`packages/ui/`) — Mantine-based presentational components. No Tauri, no Redux, no maplibre. React and Mantine are peer deps. Imported via the same barrel pattern: `import { ActionBar, Sidebar } from "@sphere/ui"`. Public surface is declared in `packages/ui/src/index.ts`.
- `apps/sphere/` — the Tauri app. May import from both packages and from `@/*` (app-local paths).

Boundaries are enforced by:

1. `packages/*/package.json` declaring only allowed deps.
2. `packages/*/biome.json` using `noRestrictedImports` to forbid back-references.
3. `packages/*/tsconfig.json` not defining `@/*`, so the app alias cannot leak in.

Violations fail `npm run typecheck` and `npm run lint`. To add code to a package, audit the new file's imports — if it imports anything restricted, it stays in the app. Never silence the lint rule — restructure instead.

To bump the app's version, run `npm version patch -w @sphere/app` from the repo root. That updates `apps/sphere/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock` atomically via `scripts/version.js`.

`@sphere/ui` and `@sphere/utils` are private workspace packages consumed via workspace links — they are never published and their versions are never read at runtime. They stay pinned at `0.0.0` on purpose. Do not bump them, and do not extend `scripts/version.js` to touch them.

## Key Dependencies

- **Frontend**: React 18, Redux Toolkit, react-map-gl 8, MapLibre GL 5, Mantine 5, Turf.js
- **Backend**: Tauri 2.9, rusqlite (bundled SQLite), geo/geojson/geozero/wkt crates

## Runtime Requirements

- Node 22 (managed via Mise)
- Rust 1.92

## Tauri Integration Patterns

**IPC Communication**: Frontend invokes Rust commands via `@tauri-apps/api` `invoke()` function.

**Custom Protocols**: The app registers a `sphere://` MapLibre protocol for accessing sources by ID:

| URL                                     | Purpose            |
|-----------------------------------------|--------------------|
| `sphere://{id}`                         | Source GeoJSON data |
| `sphere://{id}/tilejson`                | TileJSON metadata  |
| `sphere://{id}/tile?z={z}&x={x}&y={y}` | Tile bytes         |

The protocol handler (`src/lib/sphere-protocol.ts`) routes by `url.pathname`: `/tilejson` and `/tile` delegate to `MbtilesReader`, everything else to `SourceReader`. The source ID is extracted from `url.host`.

**CSV source URI params**: When loading CSV files, the `sphere://source` URI accepts query parameters: `?x=<field>&y=<field>` for lon/lat column names (defaults: `lng`/`lat`), `?wkt=<field>` for a WKT geometry column. When a source is stored, features are assigned integer IDs starting from 1 (after the max existing numeric ID). Original string IDs are preserved in `properties["$id"]`.

**Event System**: Tauri events handle:
- Theme changes (system dark/light mode)
- Drag-and-drop file handling
- Inter-window events for the properties table window:
  - `properties-set` — main → properties window: sets source, schema, filter expression
  - `properties-init` — properties window → main: signals window is ready
  - `properties-selection-changed` — main → properties window: `{ sourceId, count }` emitted on every `selectOne`/`selectMany` to drive the All/Selected filter toggle

**Plugins Used**: fs, dialog, http, clipboard

## IPC Commands

Available Tauri commands (invoked from frontend via `invoke()`):

| Command | Description |
|---------|-------------|
| `source_add`              | Load a source from URL/path |
| `source_get`              | Get source as GeoJSON string |
| `source_get_slice`        | Get a subset of features by ID list as GeoJSON string: `(id, ids: Vec<i64>) -> String` |
| `source_bounds`           | Get geographic bounds [west, south, east, north] |
| `source_get_schema`       | Get property schema: `{ columns: Record<string,string>, points_count, lines_count, polygons_count }` |
| `source_query_page`       | Paginated attribute query with optional MapLibre expression filter: `(id, offset, limit, sort_column?, sort_asc?, filter_json?) -> PageResult` |
| `source_get_column_stats` | Histogram + min/max/mean/unique counts for one column: `(id, column) -> ColumnStats` |
| `source_query_rect`       | Rect spatial query: `(id, bbox: [west,south,east,north], mode: "include"\|"intersect") -> Vec<i64>` |
| `source_add_data`         | Create an in-memory source from a GeoJSON FeatureCollection string: `(name, data) -> { id, name, location, source_type }` |
| `source_replace`          | Replace all features of an in-memory source: `(id, data: GeoJSON string) -> ()` |
| `source_patch`            | Incrementally mutate an in-memory source: `(id, patch: { added, updated, deleted_ids }) -> ()` |
| `mbtiles_get_tile`        | Get single tile from MBTiles |
| `mbtiles_get_metadata`    | Get MBTiles metadata/TileJSON |
| `selection_get_ids`       | Get IDs of currently selected features: `() -> Vec<i64>` |
| `selection_rect`          | Spatially query a source by bbox and apply to selection state in one call: `(source_id, bbox: [west,south,east,north], mode: "include"\|"intersect", op: "set"\|"preview"\|"add") -> SelectionDelta` |
| `selection_copy_geojson`  | Copy selected features as GeoJSON string: `(source_id, wrap_fc: bool) -> String` |
| `selection_copy_wkt`      | Copy selected features as WKT string: `(source_id, separator: String) -> String` |
| `show_in_finder`          | Open file location in system explorer |

## State Management Principles

- **Logic belongs outside components** — React components must only dispatch actions and render derived state. Business logic lives in listener middleware (`store/listeners/`), not in event handlers inside components.
- **Never destroy user input silently** — listeners and reducers must not clear or overwrite user-entered data (filters, field values, etc.) as a side effect of an unrelated action. There is no undo. If two pieces of state become inconsistent (e.g. a vector layer type on a raster source), the selector is responsible for ignoring or suppressing the invalid combination — not the store.
- **Derived state belongs in selectors** — computed values like option lists, flags, or filtered arrays must be computed in `createSelector` calls, not inline in JSX.
- **One place per concept** — constants, sets, and predicates (e.g. `RASTER_TILE_FORMATS`, `isRasterTileFormat`) are defined once and imported everywhere. Never inline the same logic in multiple components.

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
