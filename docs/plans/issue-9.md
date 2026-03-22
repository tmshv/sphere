# Issue 9: Select next layer/source on delete

## Context

When the user deletes a layer or source, the selection is cleared and nothing is selected. The UX expectation is that the adjacent item (next, or previous if last) should be automatically selected instead. There is also a related bug: deleting a source does not clear `selection.sourceId`, leaving a stale reference.

## Current Behavior

- **Delete layer**: `selectionSlice` extraReducer always sets `layerId = undefined` regardless of whether the deleted layer was selected.
- **Delete source**: `selection.sourceId` is NOT cleared — stale ref retained. No auto-select.

## Goal

After deleting a layer/source:
1. If the deleted item was selected, auto-select the adjacent item (prefer next index, fall back to previous).
2. If no items remain, clear selection.
3. If the deleted item was NOT selected, keep the current selection unchanged.

## Implementation Plan

### Task 1: Fix extraReducer in `selectionSlice` for `removeLayer`
- [x] In `src/store/selection/index.ts`, change the `removeLayer` extraReducer so it only clears `layerId` when the deleted layer IS the currently selected one (instead of always clearing).

### Task 2: Add `auto-select-on-delete` listener
- [ ] Create `src/store/listeners/auto-select-on-delete.ts`
- [ ] Add listener for `layerSlice.actions.removeLayer`:
  - Read state **before** dispatch to determine: sorted layer list (by `fractionIndex`), index of deleted layer, current `selection.layerId`
  - After dispatch: if deleted layer was selected, find next layer (index+1) or previous (index-1 fallback) and dispatch `selectLayer`; if none remain, dispatch `selectLayer({ layerId: undefined })`
- [ ] Add listener for `sourceSlice.actions.removeSource`:
  - Read state **before** dispatch to determine: `allIds` order, index of deleted source, current `selection.sourceId`
  - After dispatch: if deleted source was selected, find next source (index+1) or previous fallback and dispatch `selectSource`; if none remain, clear sourceId by dispatching `selectSource({ sourceId: undefined })`
  - Also handles the existing stale-reference bug (sourceId was never cleared on remove)

### Task 3: Register the listener
- [ ] In `src/store/listeners/index.ts` (or wherever listeners are registered), import and register `autoSelectOnDelete` listener

## Critical Files

| File                                          | Change                                              |
|-----------------------------------------------|-----------------------------------------------------|
| `src/store/selection/index.ts`                | Fix `removeLayer` extraReducer (conditional clear)  |
| `src/store/listeners/auto-select-on-delete.ts`| New file: listeners for layer + source deletion     |
| `src/store/listeners/index.ts`                | Register new listener                               |
| `src/store/layer/index.ts`                    | Read-only — understand sorted order (fractionIndex) |
| `src/store/source/index.ts`                   | Read-only — understand allIds order                 |

## Reusable Patterns

- Existing listener pattern: `src/store/listeners/clear-selection.ts` and `select-features.ts` — follow same shape (startListening, effect with getState/dispatch)
- Layer sort order: layers sorted by `fractionIndex` (same selector used in `LayersOutline`)
- Source order: `sourceSlice.getSelectors().selectAll(state)` or `state.source.allIds`
- Select layer: `actions.selection.selectLayer({ layerId })`
- Select source: `actions.selection.selectSource({ sourceId })`

## Verification

1. Load 2+ sources, select one, delete it → adjacent source becomes selected
2. Load 1 source, delete it → selection is cleared (no crash, no stale ref)
3. Load 2+ layers, select one, delete it → adjacent layer becomes selected
4. Load 1 layer, delete it → selection cleared
5. Delete a layer that is NOT currently selected → selected layer unchanged
6. Delete a source that is NOT currently selected → selected source unchanged
7. Run `npm test` — all existing tests pass
