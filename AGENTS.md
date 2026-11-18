# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Sphere is a geospatial data visualization and editing desktop application built with Tauri (Rust backend) and React/TypeScript (frontend) using MapLibre GL for map rendering. It supports loading GeoJSON, Shapefile, CSV, GPX, KML, KMZ, and MBTiles formats.

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
- `app` - UI state (dark theme, sidebar visibility, active sidebar tab, map tool mode (`"pan"` | `"select"`), `rasterUrlDialogOpen` for the "Add Raster from URL" dialog)
- `layer` - Layer management and styling
- `source` - Data source management and the Sources outline tree. `items`/`allIds`/`lastAdded` index the sources (unordered); tree structure lives in `nodes: Record<Id, SourceNode>` (`kind`: `source` | `source-layer` | `folder`, with `parentId`, `children`, `visible`), `rootIds`, `expandedIds` and `selectedIds` (single-select today, read via `.at(0)`). Reducers include `addFolder`, `select`, `removeSource`, `setVisible`, `setExpanded`, `move`. Pure tree logic (`createSourceNodes`, `moveNodes`, `canMove`, `resolveSourceRef`, `isEffectivelyVisible`) is in `lib/source-tree.ts`; types in `types/source-tree.ts`. Selectors in `store/source/tree-selectors.ts` are the only place that resolves a selected node to data: `selectSelectedSourceRef` (a `source-layer` resolves to its parent source plus `sourceLayer`, a `folder` to no source), `selectSelectedSourceId`, `selectSelectedInteractive` and `selectSelectedNodeActions` (which toolbar actions apply); `outline-selectors.ts` builds the outline rows. `FeatureCollecionSource` stores no GeoJSON in Redux — data lives in the Rust backend. A `version: number` field acts as a cache-bust signal: `bumpVersion(id)` increments it, which triggers `SphereSource` to re-fetch via `source_get` IPC. The `clear-selection-on-node-change` listener resets the feature `selection` when the selected node's `sourceId`/`sourceLayer` changes or a source is removed
- `selection` - Selected map features. `selectOne` sets `layerId`, clears `sourceId`; `selectMany` sets `sourceId`, clears `layerId` — mutually exclusive, and `useFeatureState` depends on this invariant. The selection bus (`lib/selection-bus.ts`) is multi-listener: `onSelectionDelta`/`onSelectionReconcile` each return an unsubscribe and any number of listeners (feature-state, the draw selection mirror) receive every `emitSelectionDelta`/`emitSelectionReconcile`. A delta carries its origin: `{ dragging: true }` marks one step of a rectangle still being dragged (the rect-select drag listeners), whose commit always emits the settled selection after it; every other delta is `{ dragging: false }`
- `draw` - Drawing mode state (`sourceId`, `pending`, `hiddenIds: number[]`, `mode`, `actionable`). Draw edits the source in place in Rust, so no feature data or patch lives in Redux. `start({ sourceId })` is a request (sets `pending`; the `start-draw` listener calls `draw_begin`, which fails on a source whose features share an id), `started` enters draw mode once the backend session exists, `commit`/`cancel({ sourceId })` request ending the session (handled by the `save-draw` listener; `pending` blocks the draw UI meanwhile), `settle` clears `pending` after a failed begin/commit/rollback, `failed` carries a draw error to be surfaced, `setHiddenIds` records the backend ids loaded into draw, `selectionChanged({ sourceId, ids })` carries a change of draw's own feature selection (the `draw-selection` listener mirrors it to the backend selection with `selection_set`, emitting the delta, or a reconcile when the delta is not the whole truth, on the selection bus; a change whose session ended, or was replaced by a new one, emits and syncs nothing), `modeChanged({ sourceId, mode })` records the draw control's mode (`mode`, from `draw.modechange`; `isCreating` is true in `draw_point`/`draw_line_string`/`draw_polygon`, and `activeTool` is the toolbar tool of the mode, the one shown pressed, through `DRAW_TOOL_MODES`/`drawToolOfMode` in `lib/draw-mode.ts`), `actionableChanged({ sourceId, actionable })` records which of draw's actions apply (`actionable: DrawActionable`, `{ trash, combineFeatures, uncombineFeatures }`, a copy of draw's `draw.actionable` payload, which draw mutates later), `toolbar({ sourceId, action })` is a press on the draw toolbar (`DrawToolbarAction`: a `DrawTool` `point`/`line`/`polygon`, or `trash`/`combine`/`uncombine`; no reducer: the `draw-toolbar` listener runs it on the control registered for the source, a tool starting its mode and a press on the tool whose mode is on cancelling the feature being drawn through draw's trash, then reads the mode back with `getMode()` and dispatches `modeChanged`, since draw's API `changeMode` fires no `draw.modechange`; the listener does nothing while a commit or rollback is `pending` (the toolbar disables its buttons meanwhile too), and after each action it gives the keyboard focus back to the map canvas through the registry's `focusDrawMap`, because draw reads Delete/Backspace and 1/2/3 only from the canvas and a button press takes the focus), `done`/`reset` clear everything (the mode and actionable too, as does `started`)
- `mapStyle` / `projection` - Map style and projection rendering state. The base style is `EMPTY_STYLE`: basemaps are user sources, not part of the style. `setMapStyle` is only for a MapLibre style `.json` file the user loads
- Basemaps - `source.addBasemap(id)` (handled by the `add-basemap` listener) adds a web raster from `BASEMAPS` (`const.ts`: `osm`, `sentinel2-2016`) as a `Raster` source with XYZ `tiles` plus a linked raster layer placed below every existing layer. Each call adds a new pair. `main.tsx` adds OSM on launch; the command palette offers both
- Raster from URL - `source.addRasterFromUrl({ template, name? })` (handled by the `add-raster-url` listener) adds an XYZ (`{z}/{x}/{y}`) or WMS GetMap (`{bbox-epsg-3857}` / `{bbox}`) URL template as a `Raster` source with a linked layer, placed like a basemap (both listeners share `addRasterWithLayer` in `listeners/add-raster-with-layer.ts`). `parseRasterTemplate` (`lib/raster-template.ts`) validates the template against `selectProjectionCrs` (`store/projection.ts`, via `projectionCrs` in `lib/projection.ts`: `EPSG:3857` for mercator and globe): WMS `SRS`/`CRS` must match it, `WIDTH` must equal `HEIGHT` and becomes `tileSize`, XYZ is Web Mercator only. The template is stored as typed, since `URL` percent-encodes path braces. `RasterUrlDialog` (mounted in `App`) validates live and is opened by `app.openRasterUrlDialog` from the command palette and the `file.add-raster-url` menu item
- `tools` - Active map tool state (`activeTool: Tool | null`); `"navigation"` = drag-pan/scroll-zoom/rotate enabled (default), `"draw"` = drawing mode active, `null` = map frozen; `selectNavigationEnabled` is true for both `"navigation"` and `"draw"`, so `useMapNavigation` governs panning in draw mode (`@sphere/draw` no longer forces `dragPan`; it saves the map's handlers when added and restores them when removed, so `MapNavigation` remounts per draw session to apply them again), and the statusbar map tool (`app.mapTool`) applies in draw as outside it: Navigation pans, Select/Info disable pan and draw the rectangle (`map-tool-changed` listener; entering draw resets the map tool to Navigation, and the user may switch while drawing). `reset` action returns to `"navigation"` and triggers the `resetTool` listener: while drawing it dispatches `draw.cancel`, which rolls the backend session back; while a commit or cancel is pending it waits for it to settle and, if draw mode stayed (the end failed), restores the `"draw"` tool
- `mapInteraction` - Fine-grained MapLibre handler toggles (`dragPan`, `scrollZoom`, `dragRotate`); combined with `tools` by `useMapNavigation`
- `settings` - User preferences (no UI yet). `copyWrapAsFeatureCollection: boolean` (default `true`) controls whether GeoJSON copy wraps features in a FeatureCollection; `copyWktSeparator: string` (default `"\n"`) is the separator between WKT geometries; `previewOutline: boolean` (default `true`, flipped by `togglePreviewOutline` from the View menu and the command palette) draws the white casing of Sources tab preview geometries — `SourcePreviewLayer` passes it as `outline` to the geometry layers, which hide the casing layer (or zero the circle stroke) but keep it mounted, so layer IDs and stacking do not change
- `error` - Transient error state surfaced in the UI; populated by the `fail` listener, cleared by `clearError`
- `properties` - Feature property display state (hover/inspect entries shown in the properties panel)
- `sky` - Map sky layer toggle/config
- `terrain` - 3D terrain and hillshade. State: `show`, `hillshade`, `exaggeration` (0-3, default 1.5), `sourceId`, `hillshadeSettings` (intensity, method, light direction/altitude/anchor, shadow/highlight/accent colours; one light source; defaults are MapLibre's own, `HILLSHADE_DEFAULTS`), changed by `updateHillshade` and mapped to the layer paint by `hillshadePaint` / `selectHillshadePaint`. Turning terrain off (`show` false) removes the hillshade too, but keeps the `hillshade` switch, so turning terrain back on restores it. Candidates (`selectTerrainCandidates`) are every raster MBTiles source (assumed Terrarium) and every web `Raster` source with a `dem` encoding (`terrarium`/`mapbox`), regardless of Sources-tree visibility; `selectHasTerrainSource` is true when any exists. The `resolve-terrain-source` listener keeps `sourceId` on a current candidate (the newest when the stored one is gone) and only ever changes `sourceId`, never `show`/`hillshade`/`exaggeration`. The Mapterhorn preset is added by `source.addTerrainProvider` (`add-terrain-provider` listener, Spotlight "Add Mapterhorn terrain"); it is added hidden in the Sources tree (its tiles drawn as a raster are noise; terrain ignores tree visibility), and its only auto-enable rule is that when it is the first elevation source it also turns terrain and hillshade on (`enableFor`). Draw mode suspends terrain only (hillshade stays). `TerrainSources` (in `SphereMap`) mounts `terrain-dem-<id>` / `hillshade-dem-<id>` `raster-dem` sources and the `sphere-hillshade` layer, which `useHillshadePlacement` keeps above the topmost raster layer. The Terrain status bar button (`TerrainButton`) toggles terrain, is disabled without a candidate, and its right-click popup (`StatusbarPopover`, in two `PopoverSection`s: Terrain with source and exaggeration, Hillshade with the switch and every hillshade setting) configures both
- `tileBoundaries` - Tile-grid debug overlay toggle

> Note: `map` is **not** a Redux slice — it is a `createAction`/`createListenerMiddleware` module (`store/map.ts`) wired into the store's middleware, not the reducer. Map viewport changes flow through that listener, not a slice reducer.

**Component Structure**:
- `components/SphereMap/` - Map rendering with react-map-gl/MapLibre
  - `SphereSource` — Renders a MapLibre `<Source>` for each Redux source entry. For `FeatureCollection` sources, data is never stored in Redux; the component watches `version` from the source slice and fetches via `source_get` IPC whenever it increments. For `Geojson` sources, data is fetched once on mount via `source_get` IPC. The draw tool (`Draw.tsx`) works on the source in place. It builds the draw control headless (`buttons: false`, every tool enabled in `controls`, so draw's keys still work), registers it for its source in the control registry `lib/draw-control.ts` (`registerDrawControl(sourceId, control)` returns the unregister function, `getDrawControl(sourceId)` finds it for the `draw-toolbar` listener; one control at a time, typed as the `DrawControlApi` subset the listener drives), forwards `draw.modechange`/`draw.actionable` as `modeChanged`/`actionableChanged`, and shows `DrawToolbar` in the `Overlay` bottom slot (a `role="toolbar"` named Draw, the tools in a `fieldset` group named Tools, since `Row` takes no ARIA props) and registers the control together with a function that focuses `map.getCanvas()`: left to right the Point (1)/Line (2)/Polygon (3) tools (bordered `IconButton`s, the one of `selectors.draw.activeTool` `active`, i.e. `aria-pressed`; a press on it is reported too, so it cancels), Delete, Combine and Uncombine (each enabled by its `actionable` flag), then Cancel and Done. It only reads selectors and dispatches `draw.toolbar`/`cancel`/`commit`; while a load or a session end runs (`blocked`, under the blocker that covers the map) every tool, edit action and Done is disabled, and Cancel only while `pending`. `start-draw` calls `draw_begin`, then `WorkingSetLoader` loads the working set (the union of the viewport part, the selection part and the pinned ids; each part is capped at `DRAW_WORKING_SET_CAP` on its own, so draw holds at most twice the cap plus the edited features. A part over the cap loads nothing and shows a notice: the viewport keeps what it loaded, the selection keeps nothing, so its features leave draw unless the viewport holds them and stay selected, red, through `DrawContextLayer`. The selection part reloads when the backend selection settles (not on each step of a rectangle drag), so a rect-selected feature becomes editable; draw's selection is the held features whose backend id is selected, looked up per held feature, never by walking the selection; and draw's own selection is mirrored back to the backend selection via `draw.selectionChanged` and the `draw-selection` listener) via `draw_get_working_set` and `draw.load`/`unload`, and `DrawOpQueue` forwards every MapLibre Draw create/update/delete/combine/uncombine event as an ordered `draw_apply` op. Its `backendId(drawId)` maps a draw id to the backend id (a number is its own; a created feature keeps its string draw id in draw and gets a backend id once its create op settled), and `createdIds()` lists the backend ids created this session. On "Done", the `save-draw` listener flushes the queue, calls `draw_commit`, dispatches `bumpVersion` so `SphereSource` re-fetches (skipped when the commit touched nothing), dispatches `draw.done` and `tools.reset`, then refreshes the selection (after draw mode ended, so the highlights land on the selection's target outside draw); if flush or commit fails the error is surfaced and draw mode stays active. Every other exit (Cancel, `tools.reset`, removing the drawn source) rolls back via `draw_rollback`, leaves draw mode, then refreshes the selection, without `bumpVersion`: the MapLibre source still holds the pre-session data, since `source_get` serves the source data, which a session changes only on commit
  - `SourcePreviewLayer` - Renders preview layers for every effectively visible node of the source tree (a node is hidden if it or any ancestor folder/source is hidden) while the Sources tab is active. `selectPreviewLayerSpecs` (in `store/preview.ts`) walks the tree and emits specs: GeoJSON/FeatureCollection sources get point/line/polygon layers with `preview-${sourceId}-{geometry}` IDs, raster MVT and web `Raster` sources get one `preview-${sourceId}-raster` layer, and each `source-layer` node of a vector MVT source gets its own geometry set with `preview-${sourceId}-${sourceLayer}-{geometry}` IDs. Layers point at the already-mounted MapLibre source (no duplicate source). Stacking follows tree order, tree top on top of the map: `selectPreviewLayerStack` mounts specs top first with `beforeId`, and `useLayerOrder(map, selectPreviewDrawOrder)` restacks after a move. Hover/click is limited to the selected node's subtree: `selectPreviewLayerIds` (selected node subtree, empty when nothing is selected or `selectSelectedInteractive` is false) is the single authoritative source of clickable layers — used by `SourcePreviewLayer` (passed to `useFeatureProperties`) and the `rect-select` and `rect-select-mvt` listeners. `selectPreviewActive` is true whenever the Sources tab is active, even with an empty or fully hidden tree
  - `selectMapLayers` (`selectors.layer.mapLayers`, used by `map-body.tsx`) - keeps only raster layers during draw mode, so a basemap stays under the drawing (`DrawContextLayer` shows the drawn source, below), and suppresses user layers while the preview is active (`selectPreviewActive`, i.e. the Sources tab is open); the Sources tab shows exactly what the tree shows, so hiding every node leaves the map empty
  - `DrawContextLayer` - While drawing, shows the drawn source (GeoJSON/FeatureCollection) in the preview look under the draw control, on the already-mounted MapLibre source, minus every feature loaded into draw: `draw.hiddenIds` (backend ids, reported by `WorkingSetLoader` via `onLoaded` → `draw.setHiddenIds`) becomes `["match", ["id"], ids, false, true]` (`excludeIdsFilter`), combined with each geometry filter. Specs and filter come from `selectors.drawContext`. Not interactive. `hiddenIds` clears on `draw.done`/`reset`, which the listeners dispatch after `bumpVersion`. Selection highlights on the drawn source stay visible here because the selection target is the drawn source while drawing (`selectors.selection.targetSourceId`/`targetInteractive`/`drawing`, from `store/selection-target.ts`)
  - `MapToolbar` - Floating Pan/Rect-Select toggle (an icon-only `SegmentedControl`). It exists with its tests but the app does not mount it today; the map tools live in the statusbar (`MapStatusbar`). When mounted it is visible on the Sources tab only, resets to `"pan"` whenever the user leaves the Sources tab (to avoid leaving `dragPan` disabled), and Escape also resets to pan
  - `RectSelectOverlay` - Transparent overlay that captures mouse drag when `mapTool` is `select` or `info`. It works in draw mode too: the target source is the drawn one, a mousedown on a draw feature (`isOverDrawFeature` in `lib/draw-hit.ts`, the style layers on draw's hot and cold sources, whatever the preset names them) starts no rectangle so draw moves the feature, no mousedown starts one while draw creates a feature (`selectors.draw.isCreating`, so a drag between vertex clicks is draw's), a drag on empty map draws the rectangle, and a click without a drag dispatches no `rectSelect.click` (draw selects by itself; the click listener also no-ops while drawing). The rect-select listeners flush the draw op queue before `selection_rect`. Drag left-to-right = `"include"` mode (solid border); right-to-left = `"intersect"` mode (dashed border). Calls `selection_rect` (single IPC call that spatially queries and mutates selection server-side, returning a delta) and emits the delta on the selection bus. Requires `selectors.selection.targetSourceId` to be set (the drawn source while drawing, else the node selected in the Sources tree)
  - `SphereLayer` — The `select` selector reads both layer and source to determine filtering strategy per layer. For **MVT PBF** sources with a filter, the user's filter expression is passed as `userFilter` to geometry layer components (`PointLayer`, `SphereLineStringLayer`, `SpherePolygonLayer`), which combine it with their geometry-type filter via `combineFilters` (`["all", geometryFilter, userFilter]`). The source ID stays original — MapLibre applies the filter client-side on decoded vector tile features. For **GeoJSON/FeatureCollection** sources with a filter, the existing backend-filtered side-source approach is used (`sourceId` resolves to `layer-${layerId}`, `FilteredLayerSource` creates the side-source). `FilteredLayerSource` skips the backend IPC call for MVT PBF sources since filtering is handled by MapLibre natively.
- `components/LeftSidebar/` - Sources and layers management
- `store/effects/` - Side effects (file loading, etc.)
- `ui/` - Reusable UI components (built on Base UI, from `@sphere/ui`)

**Directory conventions**:
- `src/types/` — TypeScript types and interfaces only. No runtime logic, no functions, no constants.
- `src/lib/` — Pure helper functions and utilities. If a function relates to a type from `src/types/`, put it in a same-named file here (e.g. `src/lib/tilejson.ts` for helpers that operate on `TileJSON`).

**Hooks** (`src/hooks/`):
- `useFeatureClick` - Registers MapLibre click handlers; `layerId` accepts `string[]` so multiple layers (e.g. preview point/line/polygon layers) share one outside-click clear
- `useMapNavigation` - Combines `selectors.mapInteraction` (dragPan/scrollZoom/dragRotate toggles) and `selectors.tools.selectNavigationEnabled` to sync MapLibre handler state with Redux. The map body runs it through `components/SphereMap/MapNavigation`, keyed by the draw session, so the handlers are applied again after the draw control restores the ones it saved

**Sphere Hooks** (`src/sphere-hooks/`):
- `useFeatureState` - Drives MapLibre `setFeatureState({ selected: true })` for all `selectedIds` in the selection slice. Resolves the MapLibre source ID from `layerId` (via `layer.items`) for single-feature selections, or from the selected source (`selectSelectedSourceId`) for multi-select (`selectMany`). For MVT sources, a selected `source-layer` node narrows highlighting to that `sourceLayer` (Layers-tab selection keeps all source-layers). Relies on numeric top-level feature ids (no `promoteId`), which feed `["id"]` and feature-state. Clears previous highlights via `removeFeatureState` before applying new ones. When the resolved `(sourceId, sourceLayers)` target changes (e.g. another tree node is selected), it clears every highlight on the previous target immediately, because the `selection.reset` delta arrives only after the async `selection_clear` IPC, when the refs already point at the new target. Bus events resolve the target from the store when they land, not from the refs, so an event that follows a target change before React rendered it (a draw session ending) still reaches the right source

### Backend (`src-tauri/`)

Tauri app with async Rust backend (Tokio). Commands in `src/commands/`:
- `source.rs` - Load sources, get GeoJSON, schema, bounds, MBTiles tiles, paginated feature queries, column statistics, rect spatial queries, in-memory source create/replace
- `draw.rs` - Draw edit sessions on in-memory sources: begin, working-set queries (by ids or bbox, with a cap), in-place ops, commit and rollback
- `selection.rs` - Server-side selection state: set/preview/add/remove/apply/clear, rect queries, paginated query over the selection, copy as GeoJSON/WKT

State stored in `SourceStorage` (thread-safe `HashMap<String, SourceEntry>` with Mutex). Each `SourceEntry` holds a `Source`, `store: Option<Arc<RwLock<FeatureStore>>>` (built at load time; absent for MBTiles sources) and `session: Option<EditSession>` (the open draw session; it lives in the entry, so removing or replacing the entry ends it).

### Rust Libraries (`crates/`)

- `libsphere` - Geospatial processing (format parsing, bounds calculation). `FeatureStore` supports incremental `upsert`/`remove`/`get_by_ids`/`refresh_schema`; `EditSession` applies create/update/delete ops to a store while journaling them, then `commit` keeps them or `rollback` undoes them and returns the touched ids
- `libexpression` - MapLibre Style Specification filter expression parser and evaluator
- `mbtiles` - MBTiles tile database reader
- `tilejson` - TileJSON spec support

### Data Flow

1. Files loaded via Tauri dialog → processed in Rust (`add-file.ts` effect)
2. Sources stored in `SourceStorage`, sent to frontend as GeoJSON
3. Draw edits apply in place in Rust (`draw_apply` on the stored `FeatureStore`); the frontend only re-fetches after a `draw_commit` that touched features (a rollback restores what the map already shows), so edits never round-trip a whole source
4. Redux state drives React rendering → MapLibre renders layers

## Frontend Layering

The frontend is an npm workspaces monorepo. Packages depend only downward:

```
apps/sphere  ->  @sphere/ui  ->  @sphere/utils
                             ->  @sphere/icons
```

- `@sphere/utils` (`packages/utils/`) — pure TS helpers. No React, no maplibre, no Tauri, no Redux, no domain types. Each package exposes a single barrel: `import { lerp, deduplicate } from "@sphere/utils"`. Public surface is declared in `packages/utils/src/index.ts`.
- `@sphere/icons` (`packages/icons/`) — the only source of icons for the app and `@sphere/ui`: `import { IconCopy } from "@sphere/icons"`. `packages/icons/src/tabler.ts` re-exports, under their `IconSomething` names, exactly the vendor icons Sphere uses, plus the shared `IconComponent` and `IconProps` types for components that take an icon as a prop. To use a new icon, add it to that list. Custom icons live in `packages/icons/src/custom/` and take the same props (and forward the ref), so callers cannot tell them from vendor icons; `IconDisclosure` (a filled disclosure triangle, not used at the moment: trees and section headers use `IconChevronRight`) is the first. React is a peer dep; no other `@sphere/*` package.
- `@sphere/ui` (`packages/ui/`) — presentational components built on Base UI (`@base-ui/react`) and CSS Modules, styled with design tokens in `packages/ui/src/tokens/`. `Tree` wraps react-arborist with its own react-dnd manager on the touch (pointer-event) backend, not HTML5: Tauri's `dragDropEnabled` swallows HTML5 drag events on Windows, and a private manager keeps it isolated from other dnd providers. Both sidebar outlines render it: Sources as a nested tree, Layers as a flat list (a layer can only be dropped back into the list). The outline bulb they share is the app's `components/VisibilityToggle`, an `IconToggle` (a glyph button with two icon/label states) with the bulb icons. No Tauri, no Redux, no maplibre. React is a peer dep; Mantine and Emotion are not used anywhere. Imported via the same barrel pattern: `import { ActionBar, Sidebar } from "@sphere/ui"`. Public surface is declared in `packages/ui/src/index.ts`.
- `@sphere/draw` (`packages/draw/`) — the MapLibre drawing control (`MapLibreDraw`), vendored from `@hyvilo/maplibre-gl-draw` (upstream commit `db8b7f0`) and converted to TypeScript, plus `@sphere/draw/maplibre-gl-draw.css`. Its source files are kebab-case (`simple-select.ts`, `map-events.ts`, …). It declares its `draw.*` map events on MapLibre's `Map` (`src/map-events.ts`) and exports its option and event types. Modes are subclasses of the abstract `Mode` (`src/modes/mode.ts`): one instance per activation, set up in the constructor, state in private fields, optional event hooks; the optional `onRender()` hook is called once after every render (after `toDisplayFeatures` for each rendered feature, also when none was rendered), which is where a mode keeps state derived from the selection in step with it. `draw.actionable` (which of trash, combine and uncombine apply) always matches the selection in `simple_select`: the mode recomputes it in `onRender`, so a silent `setSelected`, `load` or `unload` updates it too, and fires it only when it changed. The `buttons` option (default `true`) renders the map buttons; `buttons: false` runs headless, with a bare control element that takes no space, while `controls` still picks which tools and keys are enabled (the app draws its own toolbar). Tests are Vitest, next to the code; typed helpers and mocks live in `src/test-utils/` (the only place a cast is allowed, with a comment). `load(featureCollection)` and `unload(ids)` add and remove working-set features silently: they emit no `draw.create`/`draw.update`/`draw.delete`, so loaded features are never forwarded as edits (`DrawOpQueue` can trust the events). `load` keeps ids exactly as given (numbers stay numbers, `0` included; a missing or `""` id gets a generated string) and replaces an existing feature with the same id. Look comes from a preset: `classicPreset` (upstream look, the default) or `spherePreset(options)` (the app's preview look). Selection follows the app's rules in `simple_select`: a click replaces the selection, shift-click adds (a selected feature stays), cmd/ctrl-click removes (an unselected one is left alone), a click on empty map clears, and a click on the only selected feature enters `direct_select`. `setSelected(ids)` pushes the app's backend selection into draw silently (no `draw.selectionchange`; unknown ids ignored; in `direct_select` a result other than the edited feature leaves for `simple_select`). A trash of selected features emits `draw.selectionchange` with what stays selected, before `draw.delete`; the API `delete` and `unload` stay silent. Draw never force-enables `map.dragPan`: a mode that disables it for a drag restores the state it found, also when it stops mid-drag (a silent `changeMode`). Only the app imports it.
- `apps/sphere/` — the Tauri app. May import from all three packages and from `@/*` (app-local paths). Must not import `@mantine/*` or `@emotion/*`: all UI building blocks come from `@sphere/ui`. Must not import `@tabler/*`: all icons come from `@sphere/icons`. Enforced by `apps/sphere/biome.json` (and `packages/ui/biome.json` for the package itself).

**Design system**: `@sphere/ui` follows the macOS desktop idiom (El Capitan in light, later macOS in dark); the full rules are in `docs/specs/20261112-desktop-design-system.md`. In short: a control looks pressable at rest (bordered controls have a light body and hairline border, borderless glyph buttons draw the glyph in the secondary label colour); there is no hover style on any control; a press changes colour only, nothing moves; `cursor: default` everywhere except `text` in editable text and resize cursors on handles; keyboard focus draws the 3px `focus-ring` glow outside the control, or inside it for an edge-to-edge strip (a `strip` button, a tree row) whose container would clip it; `focus-ring` keeps 3:1 against `window`, `sidebar` and `content`; a selected list or tree row and a highlighted menu item are filled with `selection`, a light blue, under the plain `label` text, the same with or without focus, and icons keep their colours; density on a 4px grid (30px controls, rows and section headers, 24px menu items) with small, per-kind radii. The statusbar is the one surface that keeps Sphere's own look in both themes: a near-black strip with bold uppercase monospace readouts, grey glyphs and a yellow active tool, read from the `statusbar-*` roles; `StatusbarButton` recolours the shared glyph button by redefining the colour roles it reads, and `activeLook="fill"` (the sidebar toggle) shows on as a grey body. `StatusbarPopover` (the Terrain button's settings) keeps the look too: the popup surface in `statusbar`, with its subtree in the dark scheme. Any element stamped `data-theme="dark"` gets the dark colour roles, not only `<html>`, which is how a subtree keeps a dark look in both themes (`Popover`'s `dark` prop). Tokens in `packages/ui/src/tokens/` are role-based (`window`, `control`, `label-secondary`, `accent-glyph`, `selection`, …) over a palette, and are emitted as `--sphere-…` CSS variables for both themes; components read roles, not palette values. Every button renders through the internal button primitive `internal/ButtonBase.tsx` (shapes `push`, `glyph`, `bordered-glyph`, `plain` for a small self-drawn control such as a disclosure chevron, and `strip` for a control that fills an edge-to-edge strip such as a section header), which owns reset, cursor, focus ring, press and disabled for them. The clickable Base UI parts that are not buttons (the select trigger, segments and tabs, the colour well, the statusbar select, the slider thumb) follow the same model through the shared `internal/` modules (`segmented`, `input`, `menu`) and the same tokens: no hover style, `control-pressed` while pressed, the `--sphere-focus-ring-width` glow in `focus-ring`, the disabled opacity. Hairlines are `--sphere-hairline` and the ring width is `--sphere-focus-ring-width`; no module declares its own. Control outlines use `control-border` (pinned to a 1.4:1 floor on window, sidebar, content and the control body) and the slider track `track` (3:1, WCAG 1.4.11), both in `tokens/contrast.test.ts`. No component imports another component's `*.module.css`; shared styles live in `packages/ui/src/internal/` modules. Because nothing composes another module's classes, nothing has to out-rank another module either: do not double or triple a class in a selector (`.a.a`) to win specificity, the old workaround this replaced.

**Storybook**: `make storybook` runs Storybook for `@sphere/ui` on port 6006 and `make storybook-build` builds it (`npm run build-storybook -w @sphere/ui`). Stories live next to their component as `index.stories.tsx` (or `<Name>.stories.tsx` for a folder with several components); Foundations (tokens) and Compositions (whole app screens) live under `packages/ui/src/stories/`, with shared fixtures in `stories/fixtures.ts`. Where a state shows only on press or keyboard focus, a `States` story renders it with `stories/StateSheet.tsx`, which copies the components' own `:active` / `:focus-visible` rules onto attributes so rest, focus and press sit side by side. `stories/coverage.test.ts` fails when a component folder exported from `packages/ui/src/index.ts` has no stories file, or when an exemption names a folder the barrel no longer exports.

**Visual tests**: `npm run test:visual -w @sphere/ui` runs screenshot tests of every `@sphere/ui` component in WebKit. Baselines are `webkit-darwin` only, so run it locally on macOS; it is not expected to pass on Linux CI. Never update a baseline (`-u`) to accept a real visual change; fix the component so the existing baseline passes. Update baselines only for an intended design change. Hover cases must look identical to the rest state.

Boundaries are enforced by:

1. `packages/*/package.json` declaring only allowed deps.
2. `packages/*/biome.json` using `noRestrictedImports` to forbid back-references.
3. `packages/*/tsconfig.json` not defining `@/*`, so the app alias cannot leak in.
4. `apps/sphere/biome.json` using `noRestrictedImports` to forbid `@mantine/*`, `@emotion/*` and `@tabler/*` in the app, and `packages/ui/biome.json` does the same inside the UI package.

Violations fail `npm run typecheck` and `npm run lint`. To add code to a package, audit the new file's imports — if it imports anything restricted, it stays in the app. Never silence the lint rule — restructure instead.

To bump the app's version, run `npm version patch -w @sphere/app` from the repo root. That updates `apps/sphere/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock` atomically via `scripts/version.js`.

`@sphere/ui`, `@sphere/utils` and `@sphere/icons` are private workspace packages consumed via workspace links — they are never published and their versions are never read at runtime. They stay pinned at `0.0.0` on purpose. Do not bump them, and do not extend `scripts/version.js` to touch them.

## Key Dependencies

- **Frontend**: React 19, Redux Toolkit, react-map-gl 8, MapLibre GL 5, MapLibre Draw (vendored in `@sphere/draw`), Base UI (`@base-ui/react`), Tabler icons (`@tabler/icons-react` 3, wrapped by `@sphere/icons`), Turf.js, react-arborist 4 (tree in `@sphere/ui`, driven by `react-dnd-touch-backend`)
- **Backend**: Tauri 2.9, rusqlite (bundled SQLite), geo/geojson/geozero/wkt crates

## Runtime Requirements

- Node 22 (managed via Mise)
- Rust 1.92

## Tauri Integration Patterns

**IPC Communication**: Frontend invokes Rust commands via `@tauri-apps/api` `invoke()` function.

**Custom Protocols**: The app registers a `sphere://` MapLibre protocol for accessing sources by ID:

| URL                                    | Purpose             |
|----------------------------------------|---------------------|
| `sphere://{id}`                        | Source GeoJSON data |
| `sphere://{id}/tilejson`               | TileJSON metadata   |
| `sphere://{id}/tile?z={z}&x={x}&y={y}` | Tile bytes          |

The protocol handler (`src/lib/sphere-protocol.ts`) routes by `url.pathname`: `/tilejson` and `/tile` delegate to `MbtilesReader`, everything else to `SourceReader`. The source ID is extracted from `url.host`.

**CSV source URI params**: When loading CSV files, the `sphere://source` URI accepts query parameters: `?x=<field>&y=<field>` for lon/lat column names (defaults: `lng`/`lat`), `?wkt=<field>` for a WKT geometry column. When a source is stored, features are assigned integer IDs starting from 1 (after the max existing numeric ID). Original string IDs are preserved in `properties["$id"]`.

**KMZ source URI params**: `?entry=<path in archive>` picks one KML document of a KMZ (default: the first `.kml` entry); the source is named after that document. `addKmz` (`store/effects/add-kmz.ts`) turns a KMZ with several documents into a `folder` root named after the file, with one child `source` per document in archive order; a single-document KMZ is a plain source.

**Event System**: Tauri events handle:
- Theme changes (system dark/light mode)
- Drag-and-drop file handling
- Inter-window events for the properties table window:
  - `properties-set` — main → properties window: sets source, schema, filter expression
  - `properties-init` — properties window → main: signals window is ready
  - `properties-selection-changed` — main → properties window: `{ sourceId, count }` emitted on every `selectOne`/`selectMany` to drive the All/Selected filter toggle
- Native menu clicks:
  - `menu` — backend → main window only: `{ id }` where `id` is a namespaced menu item id (`file.open`, `view.toggle-zen-mode`, …). Predefined items (copy, quit, minimize, …) are handled by the OS and never emit this event

**Native Menu** (`src-tauri/src/menu/`): `spec.rs` holds the whole menu tree as pure data (`menu_spec()`) and is unit-tested for id uniqueness, namespacing, and accelerator collisions; `mod.rs` builds the Tauri menu from that spec and forwards clicks as the `menu` event. `build` has no unit test because `muda` refuses to create menu items off the main thread. Toggle items are plain text items, not check items — the backend cannot know Redux state, and a stale checkmark would fake it.

Each custom item declares a `Requires` (`Always` / `Source` / `Layer` / `Selection` / `TerrainSource`). Items with an unmet requirement are built disabled and re-enabled by `menu_set_context`, so the menu never offers an action that would do nothing. The frontend sends only state facts (`hasSource`, `hasLayer`, `hasSelection`, `hasTerrainSource`); the spec stays the single place that knows which items each fact governs.

Frontend wiring: `store/menu.ts` (the `menu/trigger` action and `selectMenuContext`), `store/listeners/menu.ts` (id → real actions), `store/listeners/menu-context.ts` (watches the derived context via a `predicate` and invokes `menu_set_context`), and `handleMenu()` in `tauri.ts`. To add a menu item: add it to the Rust spec, then add its id to the switch in `listeners/menu.ts`.

**Plugins Used**: fs, dialog, http, clipboard

## IPC Commands

Available Tauri commands (invoked from frontend via `invoke()`):

| Command                    | Signature / description                                                                                                                                                            |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `source_add`               | Load a source from a URL/path: `(source_url) -> SourceAddResult`                                                                                                                   |
| `kml_list_documents`       | List the KML documents in a KMZ archive, in archive order (empty for plain KML): `(path) -> Vec<String>`                                                                           |
| `source_get`               | Get source as GeoJSON string: `(id) -> String`                                                                                                                                     |
| `source_get_slice`         | Get a subset of features by ID list as GeoJSON: `(id, ids: Vec<i64>) -> String`                                                                                                    |
| `source_get_selected`      | Get currently-selected features as GeoJSON (reads selection state): `(id) -> String`                                                                                               |
| `source_get_schema`        | Get property schema: `(id) -> { columns, points_count, lines_count, polygons_count }`                                                                                              |
| `source_bounds`            | Get geographic bounds [west, south, east, north]: `(id) -> (f64,f64,f64,f64)`                                                                                                      |
| `source_get_filtered`      | Get GeoJSON filtered by a MapLibre expression: `(id, filter_json?) -> String`                                                                                                      |
| `source_query_page`        | Paginated attribute query with optional filter: `(id, offset, limit, sort_column?, sort_asc?, filter_json?) -> PageResult`                                                         |
| `source_get_column_stats`  | Histogram + min/max/mean/unique for one column: `(id, column, ids?: Vec<i64>) -> ColumnStats`                                                                                      |
| `source_query_rect`        | Rect spatial query: `(id, bbox: [f64;4], mode: "include"\|"intersect") -> Vec<i64>`                                                                                                |
| `source_add_data`          | Create an in-memory source from a FeatureCollection: `(name, data) -> SourceAddResult`                                                                                             |
| `source_replace`           | Replace all features of an in-memory source: `(id, data) -> ()`                                                                                                                    |
| `draw_begin`               | Start a draw session on an in-memory source: `(id) -> ()`; fails when two features share an id                                                                                     |
| `draw_get_working_set`     | Features to load into draw: `(id, scope: {type:"ids",ids}\|{type:"bbox",bbox}, cap) -> { features: String, overCap: bool }` (empty when over the cap)                              |
| `draw_apply`               | Apply one edit in place: `(id, op: {type:"create",drawId,feature}\|{type:"update",id,feature}\|{type:"delete",id}) -> Option<i64>` (backend id for create/update)                  |
| `draw_commit`              | Keep the session's edits, end the session: `(id) -> Vec<i64>` (touched ids); refreshes schema and source data only when it touched any                                             |
| `draw_rollback`            | Undo the session's edits, end the session: `(id) -> Vec<i64>` (touched ids); no schema refresh or source-data sync, nothing to re-fetch                                            |
| `mbtiles_get_tile`         | Get a single tile from MBTiles: `(id, z, x, y) -> Vec<u8>`                                                                                                                         |
| `mbtiles_get_metadata`     | Get MBTiles metadata/TileJSON: `(id) -> String`                                                                                                                                    |
| `selection_set`            | Replace selection with the given IDs: `(ids: Vec<i64>) -> SelectionDelta`                                                                                                          |
| `selection_preview`        | Preview selection (transient overlay): `(ids: Vec<i64>) -> SelectionDelta`                                                                                                         |
| `selection_add`            | Add IDs to the selection: `(ids: Vec<i64>) -> SelectionDelta`                                                                                                                      |
| `selection_remove`         | Remove IDs from the selection: `(ids: Vec<i64>) -> SelectionDelta`                                                                                                                 |
| `selection_apply`          | Commit the previewed selection: `() -> SelectionDelta`                                                                                                                             |
| `selection_clear`          | Clear selection, generation, and feature cache: `() -> SelectionDelta`                                                                                                             |
| `selection_count`          | Count selected features: `() -> usize`                                                                                                                                             |
| `selection_get_ids`        | Get IDs of currently selected features: `() -> Vec<i64>`                                                                                                                           |
| `selection_query_page`     | Paginated attribute query over the selection: `(source_id, offset, limit, sort_column?, sort_asc?) -> PageResult`                                                                  |
| `selection_rect`           | Rect-query a source and apply to selection in one call: `(source_id, bbox: [f64;4], mode: "include"\|"intersect", op: "set"\|"preview"\|"add", generation: u64) -> SelectionDelta` |
| `selection_rect_features`  | Rect-query supplied features and apply to selection: `(features_json, bbox: [f64;4], mode, op, generation: u64) -> SelectionDelta`                                                 |
| `selection_cache_features` | Cache features server-side for later rect queries: `(features_json) -> ()`                                                                                                         |
| `selection_copy_geojson`   | Copy selected features as GeoJSON: `(source_id, wrap_fc: bool) -> String`                                                                                                          |
| `selection_copy_wkt`       | Copy selected features as WKT: `(source_id, separator: String) -> String`                                                                                                          |
| `menu_set_context`         | Enable/disable context-dependent native menu items: `(context: { hasSource, hasLayer, hasSelection, hasTerrainSource }) -> ()`                                                     |

## State Management Principles

- **Logic belongs outside components** — React components must only dispatch actions and render derived state. Business logic lives in listener middleware (`store/listeners/`), not in event handlers inside components.
- **Never destroy user input silently** — listeners and reducers must not clear or overwrite user-entered data (filters, field values, etc.) as a side effect of an unrelated action. There is no undo. If two pieces of state become inconsistent (e.g. a vector layer type on a raster source), the selector is responsible for ignoring or suppressing the invalid combination — not the store.
- **Derived state belongs in selectors** — computed values like option lists, flags, or filtered arrays must be computed in `createSelector` calls, not inline in JSX.
- **One place per concept** — constants, sets, and predicates (e.g. `RASTER_TILE_FORMATS`, `isRasterTileFormat`) are defined once and imported everywhere. Never inline the same logic in multiple components.

## UX Principles

- **Honest empty state** — never fake state or show placeholders that imply data exists. If a filter (e.g. "Selected" in the attribute table) yields no results because nothing is selected, show an empty table. Do not hide the control or substitute a message that obscures the real state.

## Known Issues / Technical Debt

1. **Error handling** - `libsphere` errors now carry path context via `SphereError`; `src-tauri` commands still convert errors to strings at the IPC boundary, discarding structure
2. **Unsafe unwraps** - `src-tauri` URL parsing is now fallible, but `crates/libsphere` still has panicking `.unwrap()`s (`shape.rs`, `gpx.rs` bounds; `store.rs`, `schema.rs`) reachable from source loading
3. **Fake async** - Some commands marked `async` but perform blocking I/O (no `spawn_blocking`)
4. **CSP disabled** - `tauri.conf.json` has `"security": null` (no CSP — security concern for production)
5. **No type sharing** - TypeScript and Rust types are duplicated and can drift out of sync
