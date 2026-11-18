# Terrain and Hillshade from User Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revive the status bar Terrain button so terrain and hillshade are driven by an elevation source the user added (raster MBTiles or Mapterhorn), configured from a right-click popup.

**Architecture:** Candidate detection, the current terrain source and the MapLibre terrain/hillshade specs are pure functions in `lib/terrain.ts` and selectors in `store/terrain.ts`. One listener keeps the stored current source valid; another adds the Mapterhorn preset. The map mounts the current source twice as `raster-dem` (one for terrain, one for hillshade — MapLibre warns when one source feeds both) and a Sphere-owned hillshade layer placed above the topmost raster. New `@sphere/ui` pieces (popover, switch, radio list) build the popup.

**Tech Stack:** React 19, Redux Toolkit listeners, react-map-gl 8 / MapLibre GL 5, Base UI (`@base-ui/react` 1.x: `popover`, `switch`, `radio-group`), Vitest, Tauri 2 (Rust menu spec).

**Spec:** `docs/specs/20261111-terrain-sources.md` — GitHub issue #286.

## Global Constraints

- Code style and forbidden patterns of `AGENTS.md` apply (no `!`, no `as` casts, no `any`, no magic numbers/strings, no nested ternaries, no lint suppression, double quotes, no semicolons, 4 spaces).
- Run `npm run format` after every code change; `npm run lint` and `npm run typecheck` must pass.
- Commit messages: one line, imperative, no prefix, no body (e.g. `Add terrain candidate selectors`).
- MBTiles DEM encoding: `"terrarium"`, one named constant.
- Mapterhorn: tiles `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`, tileSize `512`, encoding `"terrarium"`, attribution `<a href='https://mapterhorn.com/attribution'>© Mapterhorn</a>`, name `Mapterhorn`, location `https://mapterhorn.com`.
- Exaggeration: range 0–3, default 1.5.
- `@sphere/ui` must not import app code, Redux, maplibre or Tauri; new components are exported from `packages/ui/src/index.ts` and get visual tests (`npm run test:visual -w @sphere/ui`, WebKit, macOS).
- Never reset `show`, `hillshade` or `exaggeration` as a side effect of sources appearing or disappearing.

## Review Focus

1. Current terrain source removed while terrain is on → falls back to the most recently added remaining candidate, terrain keeps rendering; no candidates → nothing renders, toggles survive (Task 2 tests).
2. Adding a second candidate while one is current → current does not change (Task 2 test).
3. Hidden source in the tree (or in a hidden folder) → still a candidate and still drives terrain (Task 1 test).
4. Draw mode entered with terrain on → `setTerrain(null)`, back on after draw ends without touching state (Task 1 test).
5. User reorders a raster layer above or below a vector layer → hillshade moves to sit directly above the topmost raster (Task 4 tests on the pure placement function).

---

### Task 1: Terrain candidates and terrain state

**Files:**
- Create: `apps/sphere/src/types/terrain.ts`, `apps/sphere/src/lib/terrain.ts`, `apps/sphere/src/lib/terrain.test.ts`, `apps/sphere/src/store/terrain.test.ts`
- Modify: `apps/sphere/src/types/source.ts` (`RasterSource`), `apps/sphere/src/store/source/index.ts` (`addRasterSource` payload), `apps/sphere/src/store/terrain.ts`, `apps/sphere/src/store/selectors.ts` (`terrain` group)

**Interfaces:**
- Produces (`types/terrain.ts`): `type DemEncoding = "terrarium" | "mapbox"`; `type TerrainCandidate = { id: Id; name: string; encoding: DemEncoding }`.
- Produces (`types/source.ts`): `RasterSource.dem?: DemEncoding` (absent = not elevation); `addRasterSource` payload gains `dem?: DemEncoding`.
- Produces (`lib/terrain.ts`): `MBTILES_DEM_ENCODING: DemEncoding = "terrarium"`; `demEncodingOf(source: Source | undefined): DemEncoding | null`; `terrainDemSourceId(id: Id): string` → `terrain-dem-${id}`; `hillshadeDemSourceId(id: Id): string` → `hillshade-dem-${id}`; `HILLSHADE_LAYER_ID = "sphere-hillshade"`; `TERRAIN_EXAGGERATION = { min: 0, max: 3, step: 0.1 }`.
- Produces (`store/terrain.ts`) state `{ show: boolean; hillshade: boolean; exaggeration: number; sourceId?: Id }`, initial `{ show: false, hillshade: false, exaggeration: 1.5 }`. Reducers: existing `show`, `hide`, `toggle`, `setExaggeration`; new `setHillshade(boolean)`, `pick(Id)` (sets `sourceId`, `show = true`), `setSource(Id | undefined)` (sets `sourceId` only), `enableFor(Id)` (sets `sourceId`, `show = true`, `hillshade = true`).
- Produces selectors: `selectTerrainCandidates(state): TerrainCandidate[]` (in `allIds` order, oldest first; memoized); `selectHasTerrainSource(state): boolean`; `selectTerrainSource(state): TerrainCandidate | null` (stored `sourceId` if it is a candidate, else last candidate, else `null`); `selectTerrainSpecification(state): TerrainSpecification | null` (`null` when `!show`, drawing, or no source; else `{ source: terrainDemSourceId(id), exaggeration }`); `selectHillshadeSourceId(state): string | null`; `selectTerrainExaggeration`, `selectIsShowTerrain`, `selectIsShowHillshade`. Expose all under `selectors.terrain`.

- [ ] Write failing tests in `lib/terrain.test.ts`: `demEncodingOf` returns `"terrarium"` for an MVT source with format `"png"`, `"webp"` and `"jpg"`; `null` for MVT `"pbf"`, GeoJSON, FeatureCollection and a Raster without `dem`; `"terrarium"` for a Raster with `dem: "terrarium"`
- [ ] Write failing tests in `store/terrain.test.ts`: candidates exclude OSM-like raster (no `dem`) and include a hidden source node (set `nodes[id].visible = false`); `selectTerrainSource` returns stored id when valid, last candidate when stored id was removed, `null` when no candidates while `show` stays `true`; `selectTerrainSpecification` is `null` while `draw` is drawing and equals `{ source: "terrain-dem-<id>", exaggeration: 1.5 }` otherwise; `pick` turns `show` on; `enableFor` turns both on
- [ ] Run `npm test -w @sphere/app -- lib/terrain store/terrain` — expect FAIL
- [ ] Implement types, `lib/terrain.ts`, `RasterSource.dem` passthrough in `addRasterSource`, and the slice/selectors; replace the old `source: "mapbox-dem"` field
- [ ] Run the same tests — expect PASS; run `npm run typecheck`
- [ ] `npm run format`, commit `Add terrain candidates and terrain state`

### Task 2: Keep the current terrain source valid

**Files:**
- Create: `apps/sphere/src/store/listeners/resolve-terrain-source.ts`, `apps/sphere/src/store/listeners/resolve-terrain-source.test.ts`
- Modify: `apps/sphere/src/store/listeners/index.ts`, `apps/sphere/src/store/index.ts` (prepend middleware)

**Interfaces:**
- Consumes: `selectTerrainCandidates`, `actions.terrain.setSource`.
- Produces: listener `resolveTerrainSource`. Predicate: stored `terrain.sourceId` is not in the candidates and the "should be" value differs (last candidate id, or `undefined` when none). Effect: `setSource(thatValue)`. It never dispatches `show`/`hide`/`setHillshade`.

- [ ] Write failing tests with a real store: first raster MBTiles added → `sourceId` = it, `show` still `false`; second candidate added → `sourceId` unchanged; current removed → `sourceId` = most recently added remaining; last removed → `sourceId` `undefined` and `show`/`hillshade` unchanged from `true`; adding a candidate again afterwards → becomes current and `show` is still `true`
- [ ] Run `npm test -w @sphere/app -- resolve-terrain-source` — expect FAIL
- [ ] Implement and register the listener
- [ ] Run tests — expect PASS
- [ ] `npm run format`, commit `Keep the current terrain source valid`

### Task 3: Mapterhorn preset

**Files:**
- Create: `apps/sphere/src/store/listeners/add-terrain-provider.ts`, `apps/sphere/src/store/listeners/add-terrain-provider.test.ts`
- Modify: `apps/sphere/src/const.ts` (`TERRAIN_PROVIDERS`), `apps/sphere/src/types/terrain.ts` (`TerrainProviderId = "mapterhorn"`, `TerrainProvider = Basemap & { dem: DemEncoding }`), `apps/sphere/src/store/source/index.ts` (`addTerrainProvider = createAction<TerrainProviderId>("source/addTerrainProvider")`, exported in `actions.source`), `apps/sphere/src/store/listeners/index.ts`, `apps/sphere/src/store/index.ts`, `apps/sphere/src/components/Spotlight/index.tsx`

**Interfaces:**
- Consumes: `actions.source.addRasterSource` (with `dem`), `selectHasTerrainSource`, `actions.terrain.enableFor`.
- Produces: `TERRAIN_PROVIDERS.mapterhorn` with the Global Constraints values; `maxzoom` as a named constant — verify Mapterhorn's published max zoom (its TileJSON omits it); if it cannot be confirmed, use 12 and note it in the commit. Spotlight command `{ id: "add-mapterhorn", title: "Add Mapterhorn terrain", description: "Add Mapterhorn elevation source" }`.

- [ ] Write failing tests: dispatching `addTerrainProvider("mapterhorn")` adds one `SourceType.Raster` source with `dem: "terrarium"`, tileSize 512 and the Mapterhorn URL, and adds **no** layer; on an empty project it sets `sourceId` to it and `show`/`hillshade` to `true`; with an existing MBTiles candidate and `show: false` nothing in the terrain slice changes; a second call adds a second source
- [ ] Run `npm test -w @sphere/app -- add-terrain-provider` — expect FAIL
- [ ] Implement the preset, action, listener (read `selectHasTerrainSource` before dispatching `addRasterSource`; source id via `nextId("terrain")`), and Spotlight entry next to the basemap entries
- [ ] Run tests — expect PASS
- [ ] `npm run format`, commit `Add Mapterhorn terrain source to Spotlight`

### Task 4: Render terrain and hillshade on the map

**Files:**
- Create: `apps/sphere/src/components/SphereMap/TerrainSources.tsx`, `apps/sphere/src/components/SphereMap/TerrainSources.test.tsx`, `apps/sphere/src/hooks/useHillshadePlacement.ts`
- Modify: `apps/sphere/src/lib/terrain.ts` (+ tests), `apps/sphere/src/components/SphereMap/map-body.tsx`, `apps/sphere/src/components/SphereMap/index.tsx` (remove the `mapbox-dem` `<Source>` and the `showTerrain` selector), `apps/sphere/src/components/SphereMap/SphereSource.tsx` (export a shared helper if needed)

**Interfaces:**
- Consumes: `selectTerrainSource`, `selectIsShowTerrain`, `selectIsShowHillshade`, `terrainDemSourceId`, `hillshadeDemSourceId`, `HILLSHADE_LAYER_ID`, existing `useTerrain(map, spec)`.
- Produces (`lib/terrain.ts`):
  - `demSourceProps(source: Source, encoding: DemEncoding): SourceProps` — MVT raster → `{ type: "raster-dem", url: "sphere://<id>/tilejson", tileSize: 256, encoding }`; Raster with `tiles` → `{ type: "raster-dem", tiles: urls, tileSize, maxzoom, attribution, encoding }`; Raster without `tiles` → `{ type: "raster-dem", url: location, encoding }`.
  - `hillshadePlacement(order: { id: string; type: string }[]): string | undefined` — returns the `beforeId` for the hillshade layer: the id of the first layer above the topmost `raster` layer (ignoring `HILLSHADE_LAYER_ID` itself); `undefined` when the topmost raster is the top layer; the bottom-most non-hillshade layer id when there is no raster layer.
  - `TerrainSources` renders `terrain-dem-<id>` only while terrain is on, `hillshade-dem-<id>` plus a `<Layer id={HILLSHADE_LAYER_ID} type="hillshade">` only while hillshade is on, keyed by source id so switching sources remounts.
  - `useHillshadePlacement(map)` — on `styledata`, if the hillshade layer exists and `hillshadePlacement(...)` differs from its current neighbour, `map.moveLayer(HILLSHADE_LAYER_ID, beforeId)`; idempotent so it settles after one move.

- [ ] Write failing tests for `demSourceProps` (all three branches) and `hillshadePlacement`: rasters below vectors → id of the lowest vector; raster above a vector → `undefined` when raster is top; `[vectorA, raster, vectorB]` → `vectorB`; no raster → first layer id; hillshade already in the list is ignored
- [ ] Write failing `TerrainSources.test.tsx` (mock `react-map-gl/maplibre` `Source`/`Layer` like existing SphereMap tests): only terrain source when terrain on/hillshade off; only hillshade source+layer when hillshade on/terrain off; nothing when no candidate
- [ ] Run `npm test -w @sphere/app -- lib/terrain TerrainSources` — expect FAIL
- [ ] Implement helpers, `TerrainSources`, `useHillshadePlacement`; mount `TerrainSources` in `map-body.tsx` after the `SphereSource` list; remove the dead `mapbox-dem` source from `SphereMap/index.tsx`
- [ ] Run tests — expect PASS; `npm run typecheck`
- [ ] Manually check in `npm run tauri dev` with the user's DEM MBTiles: pitch the map, terrain relief visible; hillshade sits over OSM and under a GeoJSON layer; Sources tab still shows terrain with the DEM node hidden; enter draw mode → terrain flat, hillshade stays
- [ ] `npm run format`, commit `Render terrain and hillshade from the current terrain source`

### Task 5: `@sphere/ui` popover, switch, radio list, status bar button context menu

**Files:**
- Create: `packages/ui/src/Popover/index.tsx`, `popover.module.css`, `index.test.tsx`, `index.visual.test.tsx`; `packages/ui/src/SwitchField/` (same set); `packages/ui/src/RadioListField/` (same set)
- Modify: `packages/ui/src/Statusbar/StatusbarButton.tsx` (+ `index.test.tsx`), `packages/ui/src/index.ts`

**Interfaces:**
- Produces:
  - `Popover({ open, anchor, onClose, children }: { open: boolean; anchor: RefObject<Element | null>; onClose: () => void; children: ReactNode })` — Base UI `Popover.Root` controlled, `Positioner` with `anchor`, `side="top"`, `align="end"`; closes on outside click / Escape via `onOpenChange(false)`.
  - `SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void })` — Base UI `Switch` inside `Field`, styled with existing `internal/input.module.css` label.
  - `RadioListField({ label, value, options, onChange }: { label: string; value: string | undefined; options: SelectOption[]; onChange: (value: string) => void })` — Base UI `RadioGroup` + `Radio`, one row per option.
  - `StatusbarButton` gains `onContextMenu?: () => void` (calls `event.preventDefault()` then the callback; not called when disabled) and `ref?: Ref<HTMLButtonElement>` (React 19 ref prop).

- [ ] Write failing unit tests: popover renders children when `open`, calls `onClose` on Escape; switch calls `onChange(true)` on click and exposes `role="switch"` with the label; radio list marks `value` as checked and calls `onChange` with the clicked option; `StatusbarButton` calls `onContextMenu` on right click, not when disabled
- [ ] Run `npm test -w @sphere/ui` — expect FAIL
- [ ] Implement the components using design tokens from `packages/ui/src/tokens/`, export them
- [ ] Run unit tests — expect PASS; add visual tests and create baselines for the new components only (`npm run test:visual -w @sphere/ui -- -u <new files>`), confirm existing baselines still pass unchanged
- [ ] `npm run lint`, `npm run format`, commit `Add Popover, SwitchField and RadioListField to @sphere/ui`

### Task 6: Terrain button and popup in the status bar

**Files:**
- Create: `apps/sphere/src/components/MapStatusbar/TerrainButton.tsx`, `apps/sphere/src/components/MapStatusbar/TerrainButton.test.tsx`
- Modify: `apps/sphere/src/components/MapStatusbar/index.tsx`, `apps/sphere/src/components/MapStatusbar/index.test.tsx` (replace the "disables Terrain" test)

**Interfaces:**
- Consumes: Task 1 selectors and actions, Task 5 components, `TERRAIN_EXAGGERATION`.
- Produces: `function TerrainButton()` — `StatusbarButton` (label `"Terrain"`, `active` = show, `disabled` = `!selectHasTerrainSource`), left click `terrain.toggle()`, right click opens `Popover` (local `useState`, anchored to the button ref) containing `RadioListField` label `"Source"` (candidates by name; change → `terrain.pick(id)`), `SliderField` label `"Exaggeration"` (0–3, step 0.1; change → `setExaggeration`), `SwitchField` label `"Hillshade"` (change → `setHillshade`).

- [ ] Write failing tests: button disabled with no candidates; enabled with one raster MBTiles; click toggles `show`; right click shows the three controls; picking a second source sets `sourceId` and `show: true`; switch sets `hillshade`; slider change dispatches `setExaggeration`
- [ ] Run `npm test -w @sphere/app -- MapStatusbar` — expect FAIL
- [ ] Implement `TerrainButton`, replace the inline Terrain button in `MapStatusbar`
- [ ] Run tests — expect PASS
- [ ] `npm run format`, commit `Enable Terrain button with source, exaggeration and hillshade popup`

### Task 7: Menu and Spotlight availability, docs

**Files:**
- Modify: `src-tauri/src/menu/spec.rs` (`Requires::TerrainSource`, `view.toggle-terrain` requiring it, tests), `src-tauri/src/menu/mod.rs` (`Context.has_terrain_source`, mapping, deserialize test), `apps/sphere/src/store/menu.ts` (+ test), `apps/sphere/src/components/Spotlight/index.tsx`, `AGENTS.md`

**Interfaces:**
- Produces: `MenuContext.hasTerrainSource: boolean` = `selectHasTerrainSource`; `sameMenuContext` compares it; Spotlight `"terrain"` command is left out of the list when `selectHasTerrainSource` is false.

- [ ] Write failing tests: Rust `items_requiring(Requires::TerrainSource)` contains `view.toggle-terrain`; context JSON with `"hasTerrainSource":true` deserializes; TS `selectMenuContext` reports `hasTerrainSource` and `sameMenuContext` detects its change
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml menu` and `npm test -w @sphere/app -- store/menu` — expect FAIL
- [ ] Implement Rust and TS changes; hide the Spotlight terrain toggle without candidates
- [ ] Run both test commands — expect PASS; run full `npm test`, `npm run lint`, `npm run typecheck`
- [ ] Update `AGENTS.md`: `terrain` slice description (state, candidates, current source resolution, Mapterhorn rule, draw-mode suspension), `menu_set_context` signature in the IPC table
- [ ] `npm run format`, commit `Gate terrain toggles on an available terrain source`
- [ ] Move this plan to `docs/plans/completed/`
