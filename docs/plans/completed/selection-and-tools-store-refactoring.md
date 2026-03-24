# Plan: Selection refactor + useMapNavigation fix

## Context

The `selection` slice conflates two concerns: sidebar UI selection (`sourceId`, `layerId`) and
map feature selection (`selectedIds`). Moving the former into their natural owners (`source` and
`layer` slices) makes each slice cohesive and keeps `selection` focused on features only.

Separately, `useNavigationMode` carries a `drawing` dep that is a cross-slice hack. The
`draw.modechange` event already handles Draw's `onAdd` re-enable correctly; the dep is redundant
and should be removed. The hook is also renamed to `useMapNavigation`.

---

## Task 1: Move source selection into `source` slice

**`src/store/source/index.ts`**
- [x] Add `selectedId?: Id` to `SourceState`
- [x] Add reducer `select(state, action: PayloadAction<Id>)` → sets `state.selectedId`
- [x] Add selector `selectSelectedId: state => state.selectedId`

---

## Task 2: Move layer selection into `layer` slice

**`src/store/layer/index.ts`**
- [x] Add `selectedId?: Id` to `LayerState`
- [x] Add reducer `select(state, action: PayloadAction<Id | undefined>)` → sets `state.selectedId`
- [x] Add selector `selectSelectedId: state => state.selectedId`
- [x] In existing `removeLayer` reducer: also clear `selectedId` when the removed layer matches
  (currently done in `selection` extraReducers — move here)

---

## Task 3: Trim `selection` slice

**`src/store/selection/index.ts`**
- [x] Remove `sourceId?: Id` and `layerId?: Id` from `SelectionState`
- [x] Remove reducers: `selectSource`, `selectLayer`
- [x] Remove selectors: `currentSourceId`, `currentLayerId`
- [x] Remove `extraReducers` block (the `removeLayer` handler moves to Task 2)
- [x] Keep: `selectedIds: number[]`, `reset`, `resetFeature`, `selectOne`
- [x] `reset` now only clears `selectedIds`

---

## Task 4: Update selectors facade

**`src/store/selectors.ts`**
- [x] `selectors.source`: already `source.selectors` — `selectSelectedId` appears automatically
- [x] `selectors.layer`: currently `{ ...layer.selectors, visibleIds }` — `selectSelectedId` appears automatically
- [x] `selectors.selection`: no change needed; `currentSourceId`/`currentLayerId` are removed from the slice itself so they simply disappear from the facade

---

## Task 5: Update `preview.ts`

**`src/store/preview.ts`**
- [x] All three selectors currently read `state.selection.sourceId`
- [x] Change to `state.source.selectedId`

---

## Task 6: Update listeners

**`src/store/listeners/add-source.ts`**
- [x] `actions.selection.selectSource({ sourceId })` → `actions.source.select(sourceId)`

**`src/store/listeners/add-blank-layer.ts`**
- [x] `actions.selection.selectLayer({ layerId })` → `actions.layer.select(layerId)`

**`src/store/listeners/select-features.ts`**
- [x] Pre-action state read: `state.selection.layerId` → `state.layer.selectedId`

**`src/store/listeners/clear-selection.ts`**
- [x] Pre-action state read: `state.selection.layerId` → `state.layer.selectedId`

---

## Task 7: Update components and hooks

**`src/components/SourcesOutline/index.tsx`**
- [x] `selectors.selection.currentSourceId` → `selectors.source.selectSelectedId`
- [x] `actions.selection.selectSource({ sourceId: id })` → `actions.source.select(id)`

**`src/components/SourcePanel/index.tsx`**
- [x] `selectors.selection.currentSourceId` → `selectors.source.selectSelectedId`

**`src/components/LayersOutline/index.tsx`**
- [x] `selectors.selection.currentLayerId` → `selectors.layer.selectSelectedId`
- [x] `actions.selection.selectLayer({ layerId })` → `actions.layer.select(layerId)`

**`src/components/LayerPanel/index.tsx`**
- [x] `selectors.selection.currentLayerId` → `selectors.layer.selectSelectedId`

**`src/sphere-hooks/useFeatureProperties.ts`**
- [x] `selectors.selection.currentLayerId` → `selectors.layer.selectSelectedId`

---

## Task 8: Rename + fix `useMapNavigation`

**Rename** `src/hooks/useNavigationMode.ts` → `src/hooks/useMapNavigation.ts`
- [x] Remove `const drawing = useAppSelector(selectors.draw.isDrawing)`
- [x] Remove `drawing` from the `useEffect` deps array
- [x] Remove the `// biome-ignore` comment

**Why it's safe**: when `effectiveDragPan = false`, the hook registers a `draw.modechange`
listener via `map.on("draw.modechange", sync)`. MapLibre-Draw fires this event on `onAdd` when
entering its initial mode (`simple_select`), so the re-disable happens correctly without needing
a Redux dep.

**Rename** `src/hooks/useNavigationMode.test.ts` → `src/hooks/useMapNavigation.test.ts`
- [x] Remove `selectors.draw.isDrawing` from `mockState` helper
- [x] Remove the test "re-disables dragPan when Draw mounts and its onAdd re-enables it"
  (this tested the `drawing` dep trigger, which is removed)

**`src/components/SphereMap/map-body.tsx`**
- [x] Update import: `useNavigationMode` → `useMapNavigation`

---

## Verification

```bash
npm test          # all 339+ tests pass
npm run lint      # no lint errors
npm run format    # no formatting changes
```

Manual smoke test: open app, load a source, verify Sources/Layers panel selection still
highlights correctly, verify map pan/zoom/rotate work, verify draw mode still works.
