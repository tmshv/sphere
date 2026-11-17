# Draw headless control and app toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up `@sphere/draw` (kebab-case files, no docs), let it run without its map buttons, and give the app one bottom toolbar with every draw tool plus Cancel and Done.

**Architecture:** The package gains a `buttons` option and reports correct `draw.actionable` state. The app runs draw with `buttons: false`, keeps the mode and actionable state in the `draw` slice, and renders a `DrawToolbar` whose buttons dispatch one action; a listener reaches the draw control through a registry, performs the action and reads the mode back.

**Tech Stack:** TypeScript, React 19, Redux Toolkit listener middleware, MapLibre GL 6, Vitest, `@sphere/ui`, `@sphere/icons`.

**Spec:** `docs/specs/20261118-draw-headless-toolbar.md`

## Global Constraints

- AGENTS.md: tests before changes; logic in listeners, not components; no lint suppressions; no `!`, no `any`, no untyped `as` (in `@sphere/draw` a cast is allowed only in `src/test-utils/`, with a comment); no magic numbers or strings; no nested ternaries.
- Code style: double quotes, no semicolons, 4-space indent, trailing commas; React components as `function Name({ a }: Props) {}`.
- `@sphere/draw` imports nothing from the app, Redux, Tauri, React, `@sphere/ui` or `@sphere/icons` (enforced by `packages/draw/biome.json`).
- Runtime strings do not change: mode names (`simple_select`, `direct_select`, `draw_point`, `draw_line_string`, `draw_polygon`, `static`), `controls` keys (`point`, `line_string`, `polygon`, `trash`, `combine_features`, `uncombine_features`), CSS class names, event names.
- `LICENSE` in `packages/draw` stays.
- Tool titles are exactly `"Point (1)"`, `"Line (2)"`, `"Polygon (3)"`; the other buttons are `"Delete"`, `"Combine"`, `"Uncombine"`, then `Cancel` and `Done` as today.
- Run `npm run format` after every code change; `npm run lint`, `npm run typecheck` and `npm test` pass at the end of every task.
- Commit messages are one line.

## Review Focus

1. A tool pressed while a feature is being edited in `direct_select` shows that tool pressed (mode read back after the action) — Task 4 test.
2. The keys `1`/`2`/`3` with the buttons hidden still start the tools, and the toolbar follows (draw fires `draw.modechange` for them) — Task 2 test (package keys work with `buttons: false`) and Task 4 test (`draw.modechange` reaches Redux, already covered by `useDrawControl`; keep it).
3. A rectangle selection pushed into draw (`setSelected`) of two polygons enables Combine — Task 3 test.
4. A toolbar action after the session ended does nothing and does not throw — Task 4 test.
5. Tools, Delete, Combine and Uncombine are disabled while `loading || pending` — Task 5 test.

---

### Task 1: Kebab-case file names, no docs

**Files:**
- Rename: every file and directory under `packages/draw/src` whose name contains `_` (about 60, including `feature_types/` → `feature-types/`, `test-utils/fixtures/style_with_sources.json` → `style-with-sources.json`)
- Delete: `packages/draw/README.md`, `packages/draw/docs/`, `packages/draw/svg/`
- Modify: every import of a renamed file; `AGENTS.md` where it names a renamed path; the `docs/API.md` reference in `packages/draw/src/modes/mode.ts:238`

**Interfaces:**
- Produces: the same package API, at new file paths. Later tasks use the new names (`src/modes/simple-select.ts`, `src/modes/direct-select.ts`, `src/lib/common-selectors.ts`, …).

- [ ] **Step 1: Rename with `git mv`.** Rule: replace every `_` in a file or directory name with `-`. List them with `fd -p '_' packages/draw/src`. Do not touch string literals.
- [ ] **Step 2: Fix imports.** Update every relative import to the new names. `rg -n "from \"\\..*_" packages/draw/src` must print nothing.
- [ ] **Step 3: Delete docs and the svg folder**, and drop the `docs/API.md` pointer in `mode.ts` (say "see `DrawActionableState`" instead).
- [ ] **Step 4: Verify.** `fd -p '_' packages/draw/src` prints nothing; `npm test -w @sphere/draw`, `npm run typecheck`, `npm run lint` pass; the test count is unchanged (444).
- [ ] **Step 5: Update AGENTS.md** paths that named a renamed file, if any.
- [ ] **Step 6: Commit** `refactor(draw): kebab-case file names and drop upstream docs`

### Task 2: `buttons` option

**Files:**
- Modify: `packages/draw/src/options.ts`, `packages/draw/src/ui.ts`, `packages/draw/src/setup.ts`, `packages/draw/src/types.ts` (if the option type lives there)
- Test: `packages/draw/src/options.test.ts`, `packages/draw/src/ui.test.ts`, `packages/draw/src/interaction-events.test.ts` or a new `packages/draw/src/buttons.test.ts`

**Interfaces:**
- Produces: `DrawOptions.buttons?: boolean` (default `true`). With `false`, `onAdd` returns an empty element with no children, and `ctx.ui` never creates a button. `controls` keeps gating tools and keys.

- [ ] **Step 1: Write the failing tests.**
  - `options.test.ts`: `setupOptions({})` has `buttons: true`; `setupOptions({ buttons: false })` has `buttons: false` and keeps the given `controls`.
  - Headless control test: a `MapLibreDraw({ buttons: false, displayControlsDefault: false, controls: { point: true, trash: true } })` added to the mock map returns from `onAdd` an element with `childElementCount === 0` and no `maplibre-gl-draw_ctrl-draw-btn` anywhere in the map container.
  - Same control: a keydown `1` on the map canvas changes the mode to `draw_point` and fires `draw.modechange`; Delete with a selected feature deletes it.
  - With `buttons` left out, the existing button tests still pass (buttons on by default).
- [ ] **Step 2: Run** `npx vitest run src/options.test.ts src/ui.test.ts` in `packages/draw` — expect FAIL.
- [ ] **Step 3: Implement.** `ui.addButtons()` returns an empty element without creating buttons when `ctx.options.buttons` is false; `setActiveButton` stays a no-op then.
- [ ] **Step 4: Run** the package tests — PASS.
- [ ] **Step 5: Commit** `feat(draw): add buttons option to run without map buttons`

### Task 3: Correct `draw.actionable`

**Files:**
- Modify: `packages/draw/src/modes/simple-select.ts` (start-up override at the `setActionableState({ combineFeatures: true, uncombineFeatures: true, trash: true })` after `#fireActionable()` in `onSetup`), and whatever the silent selection paths need (`packages/draw/src/api.ts` `setSelected`/`load`/`unload`, or the mode's render hook)
- Test: `packages/draw/src/modes/simple-select.test.ts`, `packages/draw/src/api.test.ts`

**Interfaces:**
- Produces: `draw.actionable` (`{ actions: { trash, combineFeatures, uncombineFeatures } }`) always matches the current selection in `simple_select`, including after silent selection changes. It still fires only on change.

- [ ] **Step 1: Write the failing tests.**
  - Entering `simple_select` with no selection reports `{ trash: false, combineFeatures: false, uncombineFeatures: false }` (no event fires if that equals the previous state; assert on the last reported state).
  - Entering `simple_select` with `featureIds: [polygonA]` reports `trash: true, combineFeatures: false, uncombineFeatures: false`.
  - `draw.setSelected([polygonA, polygonB])` in `simple_select` fires `draw.actionable` with `combineFeatures: true, trash: true`; then `draw.setSelected([])` fires it with all false.
  - `draw.setSelected([multiPolygon])` reports `uncombineFeatures: true`.
  - `draw.unload([polygonB])` while `[polygonA, polygonB]` are selected reports `combineFeatures: false`.
  - A Point and a Polygon selected together report `combineFeatures: false` (different types).
- [ ] **Step 2: Run** them — expect FAIL.
- [ ] **Step 3: Implement.** Remove the start-up override; recompute the actionable state after any selection change in `simple_select`, silent or not.
- [ ] **Step 4: Run** the package tests — PASS.
- [ ] **Step 5: Commit** `fix(draw): keep draw.actionable in step with the selection`

### Task 4: App state, registry and toolbar listener

**Files:**
- Modify: `apps/sphere/src/store/draw.ts`, `apps/sphere/src/hooks/useDrawControl.ts`, `apps/sphere/src/components/SphereMap/Draw.tsx`, `apps/sphere/src/store/listeners/index.ts` (and wherever listeners are registered)
- Create: `apps/sphere/src/lib/draw-control.ts`, `apps/sphere/src/store/listeners/draw-toolbar.ts`
- Test: `apps/sphere/src/store/draw.test.ts` (create if missing), `apps/sphere/src/hooks/useDrawControl.test.ts`, `apps/sphere/src/lib/draw-control.test.ts`, `apps/sphere/src/store/listeners/draw-toolbar.test.ts`, `apps/sphere/src/components/SphereMap/Draw.test.tsx`

**Interfaces:**
- Produces:
  - `type DrawToolbarAction = "point" | "line" | "polygon" | "trash" | "combine" | "uncombine"` (in `apps/sphere/src/types`).
  - `type DrawActionable = { trash: boolean; combineFeatures: boolean; uncombineFeatures: boolean }`; `draw` slice field `actionable: DrawActionable`, all false initially and after `started`/`done`/`reset`.
  - `actions.draw.actionableChanged({ sourceId, actionable })` — ignored when `sourceId` is not the drawn source.
  - `actions.draw.toolbar({ sourceId, action: DrawToolbarAction })` — a `createAction`, handled only by the listener.
  - Selectors: `selectors.draw.actionable`, `selectors.draw.mode`.
  - `registerDrawControl(sourceId: Id, control: DrawControlApi): () => void` and `getDrawControl(sourceId: Id): DrawControlApi | undefined` in `lib/draw-control.ts`, same shape as `registerDrawQueue`/`getDrawQueue`. `DrawControlApi` is the subset of `MapLibreDraw` used: `changeMode`, `getMode`, `trash`, `combineFeatures`, `uncombineFeatures`.
  - `useDrawControl` gains `onActionableChange?: (actionable: DrawActionable) => void`, fed by `draw.actionable`.
- Consumes: `actions.draw.modeChanged`, `isCreationMode` from `lib/draw-mode.ts`; Task 2's `buttons` option.

- [ ] **Step 1: Write the failing tests.**
  - Slice: `actionableChanged` for the drawn source stores the state; for another source it does not; `started`, `done` and `reset` clear it to all false.
  - `useDrawControl`: a `draw.actionable` map event calls `onActionableChange` with its `actions`.
  - Registry: `getDrawControl` returns the registered control for its source, `undefined` for another source and after unregister; unregistering an older control does not drop a newer one.
  - Listener, with a fake control registered:
    - `toolbar("point")` in `simple_select` calls `changeMode("draw_point")`, then dispatches `modeChanged({ mode: control.getMode() })`.
    - `toolbar("polygon")` while the mode is `draw_polygon` calls `trash()` (cancel), not `changeMode`, then dispatches `modeChanged` with the read-back mode.
    - `toolbar("line")` in `direct_select` calls `changeMode("draw_line_string")` and the dispatched mode is the read-back one (Review Focus 1).
    - `toolbar("trash")`, `"combine"`, `"uncombine"` call `trash()`, `combineFeatures()`, `uncombineFeatures()`.
    - With no control registered, `toolbar(...)` dispatches nothing and does not throw (Review Focus 4).
    - With `sourceId` other than the drawn source, nothing happens.
  - `Draw.test.tsx`: the control is created with `buttons: false` and the same `controls` as today; it is registered while mounted and unregistered on unmount; `draw.actionable` dispatches `actionableChanged`.
- [ ] **Step 2: Run** them in `apps/sphere` — expect FAIL.
- [ ] **Step 3: Implement** the types, slice field and actions, selectors, registry, hook callback, listener, and the `Draw.tsx` wiring (`buttons: false`, register the control, forward actionable). Map toolbar actions to modes with one lookup table (`point` → `draw_point`, `line` → `draw_line_string`, `polygon` → `draw_polygon`), not ternaries.
- [ ] **Step 4: Run** `npm test -w @sphere/app` — PASS.
- [ ] **Step 5: Commit** `feat(app): draw toolbar actions run through a listener`

### Task 5: The toolbar

**Files:**
- Create: `apps/sphere/src/components/SphereMap/DrawToolbar.tsx`, `apps/sphere/src/components/SphereMap/DrawToolbar.test.tsx`
- Modify: `apps/sphere/src/components/SphereMap/Draw.tsx` (bottom slot of `Overlay`), `packages/icons/src/tabler.ts` (two icons), `AGENTS.md`
- Possibly modify: `packages/ui` (see Step 3), with its stories, tests and visual baselines

**Interfaces:**
- Consumes: `selectors.draw.mode`, `selectors.draw.actionable`, `actions.draw.toolbar`, `actions.draw.cancel`/`commit`; `IconPoint`, `IconLine`, `IconPolygon`, `IconTrash` and the two new icons from `@sphere/icons`.
- Produces: `function DrawToolbar({ sourceId, blocked, pending }: DrawToolbarProps)` rendering, left to right: the Point/Line/Polygon group, Delete, Combine, Uncombine, then Cancel and Done.

- [ ] **Step 1: Write the failing tests** in `DrawToolbar.test.tsx` (render with a store):
  - Buttons appear in the order above, with the titles from Global Constraints.
  - Mode `draw_polygon` shows Polygon pressed (`aria-pressed="true"` or the component's pressed state) and Point/Line not; mode `simple_select` shows none pressed.
  - Clicking Point dispatches `toolbar({ action: "point" })`; clicking the pressed Polygon dispatches `toolbar({ action: "polygon" })` (the listener turns it into a cancel).
  - Delete, Combine and Uncombine follow `actionable`: each disabled when false, enabled when true; clicking dispatches `"trash"`, `"combine"`, `"uncombine"`.
  - With `blocked`, every tool, Delete, Combine, Uncombine and Done are disabled; Cancel is disabled only with `pending` (Review Focus 5).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement.** Add the two icons to `packages/icons/src/tabler.ts` (Tabler icons that read as merge and split; keep the `IconSomething` naming). Build the bar from `@sphere/ui` within `docs/specs/20261112-desktop-design-system.md`. The tool group must show no tool pressed and must report a press on the pressed tool: use `SegmentedControl` if it already does both; otherwise give `IconButton` a `pressed` prop (rendered as `aria-pressed` with the pressed look), with its story `States` case and a visual baseline for the new state (an intended design change). Logic stays out of the component: it reads selectors and dispatches only.
- [ ] **Step 4: Replace** the Cancel/Done row in `Draw.tsx`'s `Overlay` bottom slot with `<DrawToolbar …/>`; keep the blocker and notice as they are. Update `Draw.test.tsx` if it queried the old row.
- [ ] **Step 5: Run** `npm test`, `npm run lint`, `npm run typecheck` — PASS. If `@sphere/ui` changed, run its visual tests on macOS (`npm run test:visual -w @sphere/ui`).
- [ ] **Step 6: Update AGENTS.md**: the `@sphere/draw` paragraph (kebab-case files, `buttons` option, `draw.actionable` follows the selection), the `draw` slice line (`actionable`, `actionableChanged`, `toolbar`), the `Draw.tsx` description (bottom `DrawToolbar`, control registry `lib/draw-control.ts`).
- [ ] **Step 7: Commit** `feat(app): draw toolbar with every draw tool`
