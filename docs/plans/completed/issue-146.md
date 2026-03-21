# Issue 146: MBTiles Source Preview (all layers)

## Context

Issue 138 added a source preview overlay for GeoJSON sources when the Sources tab is active. It introduced `SourcePreviewLayer`, which creates a separate `sphere-preview` GeoJSON source and duplicates data already present in the map.

Issue 146 extends preview to MBTiles (MVT) sources, which contain multiple named source layers. The goal is to show all data from the selected source — all vector layers — when it is selected in the Sources tab.

The key insight: `SphereSource` already mounts both GeoJSON and MVT sources as MapLibre sources (with their real source IDs). There is no need for a duplicate `sphere-preview` source. The current `SourcePreviewLayer` can be fully replaced by components that render layers pointing at the already-mounted source.

Existing layer components (`PointLayer`, `SphereLineStringLayer`, `SpherePolygonLayer`) already accept a `sourceLayer?` prop for filtering within a vector source — they are ready to use as-is.

---

## Changes

### Task 1: Update `selectPreviewSourceId` + add `selectPreviewLayerIds`
**File:** `src/store/selectors.ts`

- [x] Extend `selectPreviewSourceId` to also return the sourceId when `source.type === SourceType.MVT`.
- [x] Add a new selector `selectPreviewLayerIds` that computes the list of primary preview layer IDs based on the selected source type:
  - GeoJSON/FeatureCollection: `["preview-{id}-point", "preview-{id}-line", "preview-{id}-polygon"]`
  - MVT (per source layer): `source.sourceLayers.flatMap(sl => ["preview-{id}-{sl.id}-point", "preview-{id}-{sl.id}-line", "preview-{id}-{sl.id}-polygon"])`
  - Empty array if no preview source.

### Task 2: Update `useFeatureSelect`
**File:** `src/sphere-hooks/useFeatureSelect.ts`

- [x] Remove import of `PREVIEW_LAYER_IDS` from `SourcePreviewLayer`.
- [x] Import `selectPreviewLayerIds` from `@/store/selectors`.
- [x] Update `selectClickableLayerIds` to spread `previewLayerIds` (from `selectPreviewLayerIds`) instead of `PREVIEW_LAYER_IDS`.
- [x] Update condition: check `previewLayerIds.length > 0` instead of `previewSourceId`.

### Task 3: Rewrite `SourcePreviewLayer`
**File:** `src/components/SphereMap/SourcePreviewLayer.tsx`

- [x] Remove: `PREVIEW_SOURCE_ID`, static `PREVIEW_LAYER_IDS` export, all raw `<Layer>` elements, the `sphere-preview` `<Source>`, and the `useEffect` that fetches GeoJSON.
- [x] Import: `PointLayer`, `SphereLineStringLayer`, `SpherePolygonLayer`, `selectPreviewLayerIds`.
- [x] Read `sourceId` via `selectPreviewSourceId`, read source object from `state.source.items[sourceId]`.
- [x] Read `layerIds` via `selectPreviewLayerIds` and pass to `useFeatureProperties(map, layerIds, delay)`.
- [x] Render per source type:
  - **GeoJSON/FeatureCollection**: one set of `PointLayer` / `SphereLineStringLayer` / `SpherePolygonLayer` pointing at `sourceId` (no `sourceLayer` prop). Layer IDs: `preview-{sourceId}-point/line/polygon`. ✓
  - **MVT**: iterate `source.sourceLayers`, render all three components per layer with `sourceLayer={sl.id}`. Layer IDs: `preview-{sourceId}-{sl.id}-point/line/polygon`. ✓
  - Use `tableu10[0]` as preview color and `visible={true}` for all. ✓

`map-body.tsx` requires **no changes** — the `previewSourceId` guard works correctly once the selector includes MVT.

### Task 4: Update `selectors.test.ts`
**File:** `src/store/selectors.test.ts`

- [x] Change existing "returns undefined when source type is MVT" test to "returns sourceId when source type is MVT".
- [x] Add `describe("selectPreviewLayerIds")` block:
  - Returns `[]` when not on Sources tab.
  - Returns `[]` when no source selected.
  - Returns 3 IDs for GeoJSON source.
  - Returns 3 IDs for FeatureCollection source.
  - Returns `3 * sourceLayers.length` IDs for MVT source.
  - Returns `[]` for Raster source.
  - Returns `[]` when source is pending.

---

## Files Modified

| File                                                       | Change                                           |
|------------------------------------------------------------|--------------------------------------------------|
| `src/store/selectors.ts`                                   | Extend selectPreviewSourceId; add selectPreviewLayerIds |
| `src/store/selectors.test.ts`                              | Update MVT test; add selectPreviewLayerIds tests |
| `src/components/SphereMap/SourcePreviewLayer.tsx`          | Full rewrite (no sphere-preview source, use layer components) |
| `src/sphere-hooks/useFeatureSelect.ts`                     | Use selectPreviewLayerIds instead of PREVIEW_LAYER_IDS |

---

## Verification

```bash
npm test                # All tests pass
npm run lint            # No lint errors
npm run tauri dev       # Load an MBTiles file, go to Sources tab, select it → all layers render on map
                        # Load a GeoJSON file, same tab → preview still works as before
```
