# Fix: Map rendering broken after v0.13.0 release

## Context

PR #140 (Source Preview, merged into v0.13.0) introduced two critical regressions that together make the map appear completely empty:

1. User adds a file → appears in Outline, but NOT visible on map
2. User adds it to layers → still nothing on map

Both are caused by logic introduced in PR #140. The feature worked in `tauri dev` because the developer tested with single-geometry GeoJSON files under specific conditions. Production users hit both bugs simultaneously.

---

## Root Causes

### Bug 1 (Primary): `selectLayers` hides ALL user layers when on Sources tab

**File**: `src/components/SphereMap/map-body.tsx:27`

```ts
if (drawing || activeSidebarTab !== "layers") {
    return []
}
```

The initial tab is `"sources"` (Redux initial state + `LeftSidebar` `useEffect`). So from app start, `selectLayers` returns `[]` — all user layers are invisible. The `SourcePreviewLayer` was meant to compensate, but it only works for selected `Geojson`/`FeatureCollection` sources. MVT and Raster sources have no visual at all when on the Sources tab.

**Impact**: Any user who has existing layers from v0.12.0, or creates new layers and switches back to Sources tab, sees nothing on the map.

### Bug 2 (Secondary): `predictLayerType` returns `undefined` → created layer renders null

**Files**: `src/store/listeners/add-blank-layer.ts:58-68`, `src/components/SphereMap/SphereLayer.tsx:52`

```ts
// add-blank-layer.ts
if (source.type === SourceType.Geojson) {
    const layerType = predictLayerType(source.meta)
    if (layerType) {           // ← only dispatches if truthy
        listenerApi.dispatch(actions.layer.setType({ id: layerId, type: layerType }))
    }
}
```

`predictLayerType` (`src/lib/predict-layer-type.ts`) returns `undefined` for:
- Mixed-geometry files (e.g., GeoJSON with both points and polygons)
- Any source where `source.meta` counts are all zero (e.g., if `source_get_schema` fails)

When type is not set, `SphereLayer` returns `["unknown", null]` and renders `null`. The layer appears in the outline but is invisible on the map.

```ts
// SphereLayer.tsx
if (!sourceId || !type) {
    return ["unknown", null]  // renders null
}
```

**Impact**: Users creating layers from mixed-geometry files (very common in real-world data) see nothing on the map. Silently fails.

### Bug 3 (Minor): `SourcePreviewLayer` swallows errors silently

**File**: `src/components/SphereMap/SourcePreviewLayer.tsx:50-53`

```ts
.catch(() => {
    setPreviewData(EMPTY_GEOJSON as GeoJSON.FeatureCollection)
})
```

No logging, no user feedback. If `invoke("source_get")` fails in production, preview silently shows nothing.

---

## Fix Plan

### Task 1: Remove tab-gating from `selectLayers`
- [x] **File**: `src/components/SphereMap/map-body.tsx`
- [x] Remove `activeSidebarTab !== "layers"` from the `if` condition in `selectLayers`
- [x] Keep only `drawing` condition (layers hidden during draw mode — correct behavior)
- [x] Result: user layers always visible regardless of active tab
- [x] The `SourcePreviewLayer` still renders as an additional overlay on the Sources tab — harmless since it uses a separate `sphere-preview` MapLibre source with its own layer IDs

```ts
// Before:
if (drawing || activeSidebarTab !== "layers") {
    return []
}
// After:
if (drawing) {
    return []
}
```

### Task 2: Add fallback type in `add-blank-layer` when prediction fails
- **File**: `src/store/listeners/add-blank-layer.ts`
- When `predictLayerType` returns `undefined`, fall back to `LayerType.Point` as default
- This ensures the layer is always visible when created, even for mixed-geometry or unknown sources
- The user can change the type afterwards in the Layer panel

```ts
// For both FeatureCollection and Geojson type blocks:
const layerType = predictLayerType(source.meta) ?? LayerType.Point
listenerApi.dispatch(actions.layer.setType({ id: layerId, type: layerType }))
```

### Task 3: Add error logging in `SourcePreviewLayer`
- **File**: `src/components/SphereMap/SourcePreviewLayer.tsx`
- Import `logger` and log the error in the catch block
- Helps diagnose production issues without changing user-facing behavior

```ts
.catch(err => {
    logger.error({ err }, "Failed to fetch preview data for source %s", sourceId)
    setPreviewData(EMPTY_GEOJSON as GeoJSON.FeatureCollection)
})
```

---

## Critical Files

| File                                              | Change                                               |
|---------------------------------------------------|------------------------------------------------------|
| `src/components/SphereMap/map-body.tsx`           | Remove `activeSidebarTab !== "layers"` from guard    |
| `src/store/listeners/add-blank-layer.ts`          | Fallback to `LayerType.Point` when prediction is nil |
| `src/components/SphereMap/SourcePreviewLayer.tsx` | Add logger import + error logging in catch           |

---

## Verification

1. Run `npm run tauri dev`
2. Open app → default Sources tab active
3. Load a GeoJSON file (any type: points, lines, polygons, mixed) → should appear in Outline AND on map (preview layers via `SourcePreviewLayer`)
4. Click "Add to layer" (in Source panel) → layer created, tab switches to Layers → layer visible on map
5. Switch back to Sources tab → layer still visible on map (regression test for Bug 1)
6. Load a mixed-geometry GeoJSON file → add to layers → layer visible on map (regression test for Bug 2)
7. Switch to Layers tab → click "New layer" → layer created (no source, Point type as default, can configure in Layer panel)
8. Run `npm test` to verify no test regressions
9. Run `npm run tauri build` → test the release build with the same workflow
