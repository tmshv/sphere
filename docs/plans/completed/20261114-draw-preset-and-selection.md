# Draw Sphere Preset and Backend-Owned Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw mode looks like the app's preview layers and uses the Rust selection, with the app's click and rectangle rules.

**Architecture:** `@sphere/draw` gains style presets and an app-style selection model:
- click rules;
- a silent `setSelected`;
- a `dragPan` that is restored, not forced on.

The app mirrors draw's selection changes to Rust (`selection_set`) after the op queue settles. It also feeds every selection-bus delta back into draw, and widens the working set to the viewport plus the selection plus the pinned edited features.

**Tech Stack:** TypeScript, React 19, Redux Toolkit listeners, MapLibre GL 5, Vitest, Tauri 2.

**Spec:** `docs/specs/20261114-draw-preset-and-selection.md`

## Global Constraints

- AGENTS.md rules:
  - tests before changes;
  - logic in listeners, not components;
  - none of: lint suppressions, `!`, untyped `as`, `any`, magic numbers, or nested ternaries;
  - double quotes, no semicolons, 4-space indent;
  - run `npm run format` after edits.
- `@sphere/draw` imports no Tauri, Redux or app code. Presets take every value as an argument.
- No `crates/*` change is planned. If one becomes necessary, bump that crate's minor version once.
- The app's preview look is fixed. Use `PREVIEW_COLOR`, `FEATURE_HIGHLIGHT_COLOR` and `PREVIEW_RADIUS` from `apps/sphere/src/const.ts`, and match the paint values in `PointLayer.tsx`, `ShpereLineStringLayer.tsx` and `SpherePolygonLayer.tsx`.
- Commit messages are one line.
- Markdown tables are aligned.

## Review Focus

1. **A just-drawn feature, selected straight away.** Its selection reaches Rust under its backend id, never its draw string id, and the count shows 1.
2. **A selected feature scrolls out of view and comes back.** Unloading must not clear its Rust selection. It is still red in `DrawContextLayer` while out, and selected in draw again once reloaded.
3. **Dragging a selected feature with the Select tool.** It moves the feature, with no rectangle drawn.
4. **A plain drag with the Navigation tool in draw mode.** It pans, and keeps panning after a feature drag-move ends.
5. **Rectangle-selecting more than the cap while zoomed out.** Nothing extra loads, the selection shows red, the notice appears, and nothing crashes.

---

### Task 1: Style presets in `@sphere/draw`, the app uses the sphere preset

**Files:**
- Create: `packages/draw/src/presets/classic.ts` (the current `lib/theme.ts` content, renamed `classicPreset`)
- Create: `packages/draw/src/presets/sphere.ts`, `packages/draw/src/presets/index.ts`
- Create: `packages/draw/src/presets/sphere.test.ts`
- Delete: `packages/draw/src/lib/theme.ts` (update its importers: `options.ts`, any tests)
- Modify: `packages/draw/src/index.ts` (export the presets and the `SpherePresetOptions` type)
- Modify: `apps/sphere/src/components/SphereMap/Draw.tsx`, `apps/sphere/src/components/SphereMap/Draw.test.tsx`

**Interfaces:**
- Produces:
  - `classicPreset: DrawStyleLayer[]`
  - `spherePreset(options: SpherePresetOptions): DrawStyleLayer[]`
  - `SpherePresetOptions = { color: string; highlightColor: string; outline: boolean; pointRadius: number }`

**Steps:**
- [ ] Write `sphere.test.ts`. It checks that the layers returned for `{ color: "black", highlightColor: "red", outline: true, pointRadius: 3 }` include each of the following:
  - **Polygon fill:** `fill-color` in `color` for inactive and `highlightColor` for active, both at `fill-opacity` 0.15.
  - **Inner polygon outline:** white, `line-width` 1, `line-offset` -1, inactive and active.
  - **Polygon edge:** `line-width` 1 in `color` (inactive), and in `highlightColor` with a `line-dasharray` (active).
  - **Line casing:** white, `line-width` 3.
  - **Line:** `line-width` 1 in `color` (inactive), and in `highlightColor` with a `line-dasharray` (active).
  - **Point:** `circle-radius` 3, `circle-stroke-color` white, `circle-stroke-width` 1, with `circle-color` in `color` (inactive) and `highlightColor` (active).
  - **Vertices and midpoints:** circles in `highlightColor` over a white ring.
- [ ] Test that with `outline: false` there is no inner polygon outline and no line casing, and the point `circle-stroke-width` is 0.
- [ ] Test that every layer id is unique.
- [ ] Test that every layer filter keeps draw's property contract: `active`, `meta`, `$type`, and `mode != static` on inactive layers, as `classicPreset` does.
- [ ] Test that `classicPreset` deep-equals the old theme. Snapshot it before moving the file.
- [ ] Run `npm test -w @sphere/draw -- src/presets`. Expect a FAIL.
- [ ] Implement the presets. Order the layers as the app stacks them: fill, inner outline, edge or casing, line, point, then vertices and midpoints. `options.ts` defaults `styles` to `classicPreset`.
- [ ] Test in `Draw.test.tsx` that the control is constructed with `spherePreset({ color: PREVIEW_COLOR, highlightColor: FEATURE_HIGHLIGHT_COLOR, outline, pointRadius: PREVIEW_RADIUS })`. `outline` is `selectors.settings.selectPreviewOutline`, read once when `Draw` mounts. The control also gets `boxSelect: false`.
- [ ] Implement it in `Draw.tsx`. Hold the outline value in a ref or initial state, because the control is built once.
- [ ] Run `npm test -w @sphere/draw && npm test -w @sphere/app -- Draw`, then `npm run lint`, `npm run typecheck` and `npm run format`. Expect all to pass.
- [ ] Commit: `feat(draw): sphere style preset matching the app preview look`

### Task 2: App-style selection in `@sphere/draw`

**Files:**
- Modify: `packages/draw/src/modes/simple_select.ts`, `packages/draw/src/modes/direct_select.ts`, `packages/draw/src/api.ts`, `packages/draw/src/lib/common_selectors.ts`
- Test: `packages/draw/src/modes/simple_select.test.ts`, `packages/draw/src/modes/direct_select.test.ts`, `packages/draw/src/api.test.ts`

**Interfaces:**
- Produces:
  - `draw.setSelected(ids: FeatureId[]): void`. It is silent: no `draw.selectionchange`, and ids not in draw are ignored. If the mode is `direct_select` and the result is not exactly that one feature, it switches to `simple_select` silently.
  - `isModifierRemoveDown(e)` (cmd or ctrl) in `common_selectors`.

**Steps:**
- [ ] Write the failing tests in `simple_select.test.ts`:
  - a click on an unselected feature replaces the selection;
  - shift-click on an unselected feature adds it;
  - shift-click on a selected feature keeps it selected;
  - cmd-click and ctrl-click on a selected feature remove it;
  - cmd-click on an unselected feature changes nothing;
  - a click on empty map clears the selection;
  - a click on the only selected feature still enters `direct_select`.
- [ ] Write the failing tests for `dragPan` in `simple_select.test.ts` and `direct_select.test.ts`:
  - with `map.dragPan` disabled before the mode starts, a feature drag-move or a vertex drag ends with `dragPan` still disabled;
  - with it enabled before, it ends enabled.
- [ ] Write the failing tests in `api.test.ts`:
  - `setSelected([a, b])` selects both with no `draw.selectionchange`;
  - `setSelected` ignores an unknown id;
  - `setSelected([])` while in `direct_select` on `a` leaves `direct_select`;
  - `setSelected([a])` while in `direct_select` on `a` stays;
  - `unload` of a selected feature emits no `draw.selectionchange`;
  - `load` emits no `draw.selectionchange`.
- [ ] Run `npm test -w @sphere/draw -- src/modes src/api`. Expect a FAIL.
- [ ] Implement:
  - **Click rules in `#clickOnFeature`.** Replace upstream's shift-toggle with the rules above.
  - **`dragPan`.** Record `map.dragPan.isEnabled()` when a mode disables it, and restore that value instead of calling `enable()` unconditionally (`#stopExtendedInteractions`, `direct_select` stop/drag end, `setup.ts`'s toggle).
  - **`setSelected` in `api.ts`.** Call `store.setSelected(ids, { silent: true })`, then render.
- [ ] Run `npm test -w @sphere/draw`, then lint, typecheck and format. Expect all to pass.
- [ ] Update the `@sphere/draw` paragraph in `AGENTS.md`: presets, click rules, `setSelected`, and the restored `dragPan`.
- [ ] Commit: `feat(draw): app-style click rules, silent setSelected, restored dragPan`

### Task 3: Selection plumbing in the app: a multi-listener bus, a draw-aware target source, queue id mapping

**Files:**
- Modify: `apps/sphere/src/lib/selection-bus.ts` (+ create `selection-bus.test.ts`)
- Modify: `apps/sphere/src/lib/draw-session.ts`, `apps/sphere/src/lib/draw-session.test.ts`
- Modify: `apps/sphere/src/store/source/tree-selectors.ts` or a new `apps/sphere/src/store/selection-target.ts` (+ test)
- Modify: `apps/sphere/src/sphere-hooks/useFeatureState.ts` (+ its test), `apps/sphere/src/store/listeners/rect-select.ts` (+ its test)

**Interfaces:**
- Produces:
  - `onSelectionDelta` and `onSelectionReconcile` accept any number of listeners. Each returns its own unsubscribe, and every listener gets every emit.
  - `DrawOpQueue.backendId(drawId: DrawFeatureId): number | undefined`: the identity for a number; for a draw string id, the backend id once its create op settled.
  - `DrawOpQueue.drawId(backendId: number): DrawFeatureId`: the draw string id of a created feature, else the number itself.
  - `selectSelectionTargetSourceId(state): string | undefined`: `state.draw.sourceId` while drawing, else `selectSelectedSourceId`.
  - `selectSelectionTargetInteractive(state): boolean`: true while drawing, else `selectSelectedInteractive`.

**Steps:**
- [ ] Write the failing tests:
  - **Bus:** two delta listeners both receive an emit, and unsubscribing one leaves the other. The same for reconcile.
  - **Queue:** after a `create` op with `drawId: "abc"` resolves to 42, `backendId("abc") === 42` and `drawId(42) === "abc"`. Before it resolves, `backendId("abc")` is undefined. `backendId(7) === 7` and `drawId(7) === 7`.
  - **Selectors:** while `draw.sourceId` is `"s2"` and the tree selects `"s1"`, the target is `"s2"` and interactive is true. With no draw session, they fall back.
  - **`rect-select`:** the drag and commit listeners use the target selectors. In draw mode they await `getDrawQueue(sourceId)?.flush()` before `selectionRect`. The click listener does nothing while drawing, because draw owns clicks.
  - **`useFeatureState`:** with no layer selected, it highlights on the target source.
- [ ] Run `npm test -w @sphere/app -- selection-bus draw-session selection-target rect-select useFeatureState`. Expect a FAIL.
- [ ] Implement:
  - the bus with a `Set` of listeners per kind;
  - the queue keeps two maps, filled in `run()` for `create` ops;
  - the selectors;
  - switching `rect-select.ts` and `useFeatureState.ts` to them.
- [ ] Run the app tests, then lint, typecheck and format. Expect all to pass.
- [ ] Commit: `feat(app): multi-listener selection bus and draw-aware selection target`

### Task 4: Mirror draw's selection both ways, and the working set follows the selection

**Files:**
- Create: `apps/sphere/src/lib/draw-selection.ts` (+ `draw-selection.test.ts`): pure helpers
- Create: `apps/sphere/src/store/listeners/draw-selection.ts` (+ test). Register it in `store/listeners/index.ts` and `store/index.ts`.
- Modify: `apps/sphere/src/store/draw.ts` (+ test): add the action `selectionChanged({ sourceId, ids: DrawFeatureId[] })` with no state change.
- Modify: `apps/sphere/src/hooks/useDrawControl.ts` (+ test): forward `draw.selectionchange` through a new `onSelectionChange(ids)` prop.
- Modify: `apps/sphere/src/lib/working-set-loader.ts`, `apps/sphere/src/lib/draw-working-set.ts` (+ tests)
- Modify: `apps/sphere/src/components/SphereMap/Draw.tsx` (+ test)

**Interfaces:**
- Consumes:
  - `DrawOpQueue.backendId` and `drawId`, the multi-listener bus and `selectSelectionTargetSourceId` (Task 3);
  - `draw.setSelected` (Task 2).
- Produces:
  - `drawSelectionIds(selected: ReadonlySet<number>, loaded: ReadonlySet<DrawFeatureId>, toDrawId: (id: number) => DrawFeatureId): DrawFeatureId[]`
  - `applyDelta(selected: Set<number>, delta: SelectionDelta): void`
  - `WorkingSetLoader.selectionChanged(ids: number[]): void`

**Steps:**
- [ ] Write the failing tests for the `draw-selection` listener, on `draw.selectionChanged`:
  - it awaits `getDrawQueue(sourceId).flush()`;
  - it maps ids with `backendId`;
  - it calls `selectionSet`, emits the delta on the bus, then dispatches `selection.sync({ count, sourceId })` and `selection.apply()`;
  - **Latest wins:** an older change whose IPC resolves after a newer one emits nothing.
  - **Failed flush:** it surfaces nothing new (the queue already did) and does not call `selectionSet`.
  - **Vertices are not mirrored:** the forwarded ids are the feature ids from the event's `features`, and an event whose feature ids equal the last ones sent is skipped.
- [ ] Write the failing tests in `draw-selection.test.ts`: `drawSelectionIds` keeps only loaded ids and maps a created feature's backend id to its draw id. `applyDelta` adds and removes.
- [ ] Write the failing tests in `working-set-loader.test.ts`:
  - **Begin:** loads the viewport (bbox scope) and the selection (ids scope) when the selection belongs to the drawn source. Either part over the cap loads nothing for that part only.
  - **`selectionChanged(ids)`:** loads the selected ids that are not loaded yet, if they fit the cap.
  - **Unloading:** a feature leaves draw only when it is not in the viewport part, not selected, and not pinned.
  - **The notice:** `onOverCap` reports `"ids"` when the selection part is over the cap, else `"bbox"` when the viewport part is, else `undefined`.
- [ ] Write the failing tests in `Draw.test.tsx`:
  - a bus delta updates draw's selection through `setSelected(drawSelectionIds(...))`;
  - after a load, draw selects the selected features now loaded;
  - `draw.selectionchange` dispatches `draw.selectionChanged`;
  - the subscription ends on unmount.
- [ ] Run `npm test -w @sphere/app -- draw-selection working-set-loader Draw draw useDrawControl`. Expect a FAIL.
- [ ] Implement:
  - **`Draw.tsx`.** Hold `selected: Set<number>`, seeded from `selectionGetIds()` at begin when the selection belongs to the drawn source. Subscribe to bus deltas and reconciles, which update `selected`, call `loader.selectionChanged` and push `setSelected`. The component only wires them; the mirroring logic lives in the listener and `lib/draw-selection.ts`.
  - **The loader.** Replace `chooseWorkingSetScope` with the two parts.
- [ ] Run the app tests, then lint, typecheck and format. Expect all to pass.
- [ ] Commit: `feat(app): draw selection mirrors the backend selection both ways`

### Task 5: Map tools in draw mode

**Files:**
- Modify: `apps/sphere/src/store/tools.ts` (+ test), `apps/sphere/src/store/listeners/map-tool-changed.ts` (+ test)
- Modify: `apps/sphere/src/components/SphereMap/RectSelectOverlay.tsx` (+ test)
- Create: `apps/sphere/src/lib/draw-hit.ts` (+ test)
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: `isOverDrawFeature(map: Pick<maplibregl.Map, "getStyle" | "queryRenderedFeatures">, point: { x: number; y: number }): boolean`. It is true when `queryRenderedFeatures` at the point, limited to style layers whose id starts with `gl-draw-`, returns any feature.

**Steps:**
- [ ] Write the failing tests:
  - `selectNavigationEnabled` is true for `"draw"`, as for `"navigation"`.
  - Entering draw still resets the map tool to Navigation; the stale "so RectSelectOverlay unmounts" comment goes.
  - Switching to Select during draw is allowed.
  - **`RectSelectOverlay` while drawing with the Select tool:**
    - a mousedown where `isOverDrawFeature` is true starts no rectangle;
    - a drag on empty map dispatches `rectSelect.drag` and `rectSelect.commit`;
    - a click without a drag dispatches no `rectSelect.click`.
  - **`isOverDrawFeature`:** true and false cases on a stubbed map.
- [ ] Run `npm test -w @sphere/app -- tools map-tool-changed RectSelectOverlay draw-hit`. Expect a FAIL.
- [ ] Implement it. The overlay reads `selectors.draw` for "drawing" and gets the map from `mapRef`.
- [ ] Run `npm test` at the root, then `npm run lint`, `npm run typecheck`, `npm run build` and `npm run format`. Expect all to pass.
- [ ] Update `AGENTS.md`:
  - the `draw` slice: `selectionChanged`;
  - `DrawContextLayer` and `Draw.tsx`: the union working set and the selection mirroring;
  - `RectSelectOverlay`: draw mode;
  - the selection bus: multi-listener;
  - `tools`: the `selectNavigationEnabled` change.
- [ ] Commit: `feat(app): select and navigation tools work in draw mode`
