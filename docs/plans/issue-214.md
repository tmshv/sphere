# MBTiles Selection Tool Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable rect-select, click-select, and copy (GeoJSON/WKT) for MBTiles (MVT) sources, transparent to all UI consumers.

**Architecture:** Client-side `queryRenderedFeatures` pre-filters visible features, sends them to Rust via a new IPC. Rust builds a temporary `FeatureStore`, runs the same include/intersect spatial query used for GeoJSON sources, updates `SelectionState`, and caches features for copy/properties. A `HashMap<i64, geojson::Feature>` feature cache in `SelectionStorage` provides fallback data for commands that normally require a source-level `FeatureStore`. The frontend rect-select listener branches by source type; all downstream consumers (Redux selection slice, selection bus, `useFeatureState`, copy commands, properties panel) remain unchanged.

**Tech Stack:** Rust (libsphere `FeatureStore`, geojson crate), TypeScript (MapLibre `queryRenderedFeatures`, Redux listener middleware)

**Known Limitations:**
- Only visible/rendered features can be selected (tiles outside viewport are not loaded)
- MVT features must have integer IDs in the tile data; tilesets without IDs are unsupported
- Duplicate features at tile boundaries are deduplicated by ID; features without IDs are dropped

---

## File Map

| File                                          | Action | Responsibility                                      |
|-----------------------------------------------|--------|-----------------------------------------------------|
| `src-tauri/src/selection.rs`                  | Modify | Add `feature_cache` field to `SelectionStorage`     |
| `src-tauri/src/commands/selection.rs`         | Modify | Add `selection_rect_features`, `selection_cache_features` commands; update copy/properties fallback |
| `src-tauri/src/main.rs`                       | Modify | Register new commands                               |
| `src/lib/selection-ipc.ts`                    | Modify | Add `selectionRectFeatures`, `selectionCacheFeatures` wrappers |
| `src/lib/maplibre.ts`                         | Modify | Add `queryFeaturesInRect` helper                    |
| `src/store/listeners/rect-select.ts`          | Modify | Branch drag/commit/click by source type             |
| `src/sphere-hooks/useFeatureState.ts`         | Modify | Handle MVT `sourceLayer` in set/removeFeatureState  |
| `src/components/SphereMap/SphereSource.tsx`    | No change | MVT feature IDs come from tile data, no `promoteId` needed |

---

### Task 1: Add feature cache to SelectionStorage

**Files:**
- Modify: `src-tauri/src/selection.rs`

- [x] **Step 1: Add `feature_cache` field**

```rust
// src-tauri/src/selection.rs
use geojson::Feature;
use libsphere::SelectionState;
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct SelectionStorage {
    pub inner: Mutex<SelectionState>,
    pub generation: Mutex<u64>,
    pub feature_cache: Mutex<HashMap<i64, Feature>>,
}
```

The `feature_cache` stores features received from the frontend's `queryRenderedFeatures` calls. It accumulates features across selection operations (rect-select, click) and clears on `selection_clear`. Copy and properties commands fall back to this cache when the source has no `FeatureStore`.

- [x] **Step 2: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: compiles successfully

- [x] **Step 3: Commit**

```bash
git add src-tauri/src/selection.rs
git commit -m "Add feature_cache to SelectionStorage for MBTiles selection support"
```

---

### Task 2: Add `selection_rect_features` Rust command

**Files:**
- Modify: `src-tauri/src/commands/selection.rs`
- Modify: `src-tauri/src/main.rs`

This command receives GeoJSON features (pre-filtered by `queryRenderedFeatures` on the frontend), builds a temporary `FeatureStore`, runs the same include/intersect spatial query, updates `SelectionState`, and merges features into the cache.

- [x] **Step 1: Write test for the new command's core logic**

Add a helper function `rect_features_core` that encapsulates the logic (parse features, build store, query, update selection, update cache) so it can be unit tested without Tauri `State`.

In `src-tauri/src/commands/selection.rs`, add at the bottom of the `#[cfg(test)] mod tests` block:

```rust
#[test]
fn rect_features_selects_by_include_mode() {
    use libsphere::SelectionState;

    // Three points: (0,0), (5,5), (20,20)
    let features = vec![
        point_feature(1, 0.0, 0.0),
        point_feature(2, 5.0, 5.0),
        point_feature(3, 20.0, 20.0),
    ];
    let bbox = [-1.0, -1.0, 10.0, 10.0]; // includes points 1,2 but not 3
    let mut state = SelectionState::default();
    let mut cache = std::collections::HashMap::new();

    let delta = rect_features_core(&features, bbox, "include", "set", &mut state, &mut cache);

    let mut selected: Vec<i64> = delta.added.clone();
    selected.sort();
    assert_eq!(selected, vec![1, 2]);
    assert!(delta.removed.is_empty());
    // Cache should contain all 3 features (superset)
    assert_eq!(cache.len(), 3);
}

#[test]
fn rect_features_merges_cache_across_calls() {
    use libsphere::SelectionState;

    let features1 = vec![point_feature(1, 0.0, 0.0)];
    let features2 = vec![point_feature(2, 5.0, 5.0)];
    let bbox = [-1.0, -1.0, 10.0, 10.0];
    let mut state = SelectionState::default();
    let mut cache = std::collections::HashMap::new();

    rect_features_core(&features1, bbox, "include", "set", &mut state, &mut cache);
    rect_features_core(&features2, bbox, "include", "add", &mut state, &mut cache);

    assert_eq!(cache.len(), 2);
    assert!(cache.contains_key(&1));
    assert!(cache.contains_key(&2));
}
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd src-tauri && cargo test --lib -- rect_features`
Expected: FAIL — `rect_features_core` not defined

- [x] **Step 3: Implement `rect_features_core`**

Add above the test module in `src-tauri/src/commands/selection.rs`:

```rust
use geojson::Feature;
use std::collections::HashMap;

fn feature_id_i64(feature: &Feature) -> Option<i64> {
    match &feature.id {
        Some(geojson::feature::Id::Number(n)) => n.as_i64(),
        _ => None,
    }
}

fn rect_features_core(
    features: &[Feature],
    bbox: [f64; 4],
    mode: &str,
    op: &str,
    state: &mut libsphere::SelectionState,
    cache: &mut HashMap<i64, Feature>,
) -> SelectionDelta {
    // Merge all features into cache
    for f in features {
        if let Some(id) = feature_id_i64(f) {
            cache.insert(id, f.clone());
        }
    }

    // Build temporary spatial index and query
    let store = libsphere::FeatureStore::from_features(features.to_vec());
    let ids = store.query_rect(bbox, mode);

    match op {
        "set" => state.set(&ids),
        "preview" => state.preview(&ids),
        "add" => state.add(&ids),
        _ => SelectionDelta { added: vec![], removed: vec![] },
    }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test --lib -- rect_features`
Expected: PASS

- [x] **Step 5: Add the Tauri command**

Add in `src-tauri/src/commands/selection.rs`:

```rust
#[tauri::command]
pub async fn selection_rect_features(
    features_json: String,
    bbox: [f64; 4],
    mode: String,
    op: String,
    generation: u64,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let features: Vec<Feature> =
        serde_json::from_str(&features_json).map_err(|e| e.to_string())?;

    let mut last_gen = selection_storage.generation.lock().unwrap();
    if generation < *last_gen {
        return Ok(SelectionDelta {
            added: vec![],
            removed: vec![],
        });
    }
    *last_gen = generation;

    let mut state = selection_storage.inner.lock().unwrap();
    let mut cache = selection_storage.feature_cache.lock().unwrap();
    Ok(rect_features_core(&features, bbox, &mode, &op, &mut state, &mut cache))
}
```

- [x] **Step 6: Register the command in main.rs**

Add `commands::selection::selection_rect_features` to the `generate_handler!` list after `selection_rect`.

- [x] **Step 7: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: compiles successfully

- [x] **Step 8: Commit**

```bash
git add src-tauri/src/commands/selection.rs src-tauri/src/main.rs
git commit -m "Add selection_rect_features command for client-provided feature selection"
```

---

### Task 3: Add `selection_cache_features` Rust command

**Files:**
- Modify: `src-tauri/src/commands/selection.rs`
- Modify: `src-tauri/src/main.rs`

Used by the click handler: when a single MVT feature is click-selected, the frontend sends it to be cached so copy/properties work.

- [x] **Step 1: Add the command**

```rust
#[tauri::command]
pub async fn selection_cache_features(
    features_json: String,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<(), String> {
    let features: Vec<Feature> =
        serde_json::from_str(&features_json).map_err(|e| e.to_string())?;
    let mut cache = selection_storage.feature_cache.lock().unwrap();
    for f in &features {
        if let Some(id) = feature_id_i64(f) {
            cache.insert(id, f.clone());
        }
    }
    Ok(())
}
```

- [x] **Step 2: Register in main.rs**

Add `commands::selection::selection_cache_features` to the `generate_handler!` list.

- [x] **Step 3: Clear cache on `selection_clear`**

Modify `selection_clear` in `src-tauri/src/commands/selection.rs`:

```rust
#[tauri::command]
pub async fn selection_clear(
    storage: State<'_, SelectionStorage>,
) -> Result<SelectionDelta, String> {
    let mut last_gen = storage.generation.lock().unwrap();
    *last_gen = 0;
    let mut cache = storage.feature_cache.lock().unwrap();
    cache.clear();
    let mut state = storage.inner.lock().unwrap();
    Ok(state.clear())
}
```

- [x] **Step 4: Verify compilation and tests**

Run: `cd src-tauri && cargo check && cargo test --lib`
Expected: compiles, all existing tests pass

- [x] **Step 5: Commit**

```bash
git add src-tauri/src/commands/selection.rs src-tauri/src/main.rs
git commit -m "Add selection_cache_features command and clear cache on selection_clear"
```

---

### Task 4: Update copy and properties commands to fall back to feature cache

**Files:**
- Modify: `src-tauri/src/commands/selection.rs`

When a source has no `FeatureStore` (MBTiles), these commands should build a temporary `FeatureCollection` from the feature cache instead.

- [ ] **Step 1: Write tests for cache fallback logic**

Add to the test module:

```rust
#[test]
fn build_fc_from_cache_filters_by_ids() {
    let mut cache = HashMap::new();
    cache.insert(1, point_feature(1, 0.0, 0.0));
    cache.insert(2, point_feature(2, 1.0, 1.0));
    cache.insert(3, point_feature(3, 2.0, 2.0));

    let ids = vec![1, 3];
    let fc = fc_from_cache(&cache, &ids);
    assert_eq!(fc.features.len(), 2);
}

#[test]
fn build_fc_from_cache_empty_ids_returns_empty() {
    let mut cache = HashMap::new();
    cache.insert(1, point_feature(1, 0.0, 0.0));

    let fc = fc_from_cache(&cache, &[]);
    assert_eq!(fc.features.len(), 0);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src-tauri && cargo test --lib -- fc_from_cache`
Expected: FAIL — `fc_from_cache` not defined

- [ ] **Step 3: Implement `fc_from_cache` helper**

Add above the test module:

```rust
fn fc_from_cache(
    cache: &HashMap<i64, Feature>,
    ids: &[i64],
) -> geojson::FeatureCollection {
    let features: Vec<Feature> = ids.iter().filter_map(|id| cache.get(id).cloned()).collect();
    geojson::FeatureCollection {
        features,
        bbox: None,
        foreign_members: None,
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test --lib -- fc_from_cache`
Expected: PASS

- [ ] **Step 5: Update `selection_copy_geojson` to fall back to cache**

Replace the body of `selection_copy_geojson`:

```rust
#[tauri::command]
pub async fn selection_copy_geojson(
    source_id: String,
    wrap_fc: bool,
    source_storage: State<'_, SourceStorage>,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<String, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(String::new());
    }

    let fc = {
        let store = source_storage.store.lock().unwrap();
        let entry = store
            .get(&source_id)
            .ok_or_else(|| format!("Not found {}", &source_id))?;
        match entry.source.to_feature_collection() {
            Ok(fc) => slice_feature_collection(fc, &ids),
            Err(_) => {
                let cache = selection_storage.feature_cache.lock().unwrap();
                fc_from_cache(&cache, &ids)
            }
        }
    };

    serialize_geojson_copy(&fc, wrap_fc)
}
```

- [ ] **Step 6: Update `selection_copy_wkt` to fall back to cache**

Replace the body of `selection_copy_wkt`:

```rust
#[tauri::command]
pub async fn selection_copy_wkt(
    source_id: String,
    separator: String,
    source_storage: State<'_, SourceStorage>,
    selection_storage: State<'_, SelectionStorage>,
) -> Result<String, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(String::new());
    }

    let fc = {
        let store = source_storage.store.lock().unwrap();
        let entry = store
            .get(&source_id)
            .ok_or_else(|| format!("Not found {}", &source_id))?;
        match entry.source.to_feature_collection() {
            Ok(fc) => fc,
            Err(_) => {
                let cache = selection_storage.feature_cache.lock().unwrap();
                fc_from_cache(&cache, &ids)
            }
        }
    };

    Ok(features_to_wkt(&fc, &ids, &separator))
}
```

- [ ] **Step 7: Update `selection_query_page` to fall back to cache**

Replace the `FeatureStore` lookup in `selection_query_page`:

```rust
#[tauri::command]
pub async fn selection_query_page(
    source_id: String,
    offset: u64,
    limit: u64,
    sort_column: Option<String>,
    sort_asc: Option<bool>,
    selection_storage: State<'_, SelectionStorage>,
    source_storage: State<'_, SourceStorage>,
) -> Result<PageResult, String> {
    let ids = {
        let state = selection_storage.inner.lock().unwrap();
        state.get_ids()
    };

    if ids.is_empty() {
        return Ok(PageResult {
            features: vec![],
            total_matching: 0,
            offset,
            limit,
        });
    }

    let fs = {
        let store = source_storage.store.lock().unwrap();
        let entry = store.get(&source_id).ok_or_else(|| format!("Not found {}", &source_id))?;
        match &entry.store {
            Some(s) => s.clone(),
            None => {
                let cache = selection_storage.feature_cache.lock().unwrap();
                let fc = fc_from_cache(&cache, &ids);
                std::sync::Arc::new(libsphere::FeatureStore::from_features(fc.features))
            }
        }
    };

    let filter_value = serde_json::json!(["in", ["id"], ["literal", ids]]);
    let filter = libexpression::parse(filter_value).map_err(|e| e.to_string())?;

    let result = fs.query_page(
        offset,
        limit,
        Some(&filter),
        sort_column.as_deref(),
        sort_asc.unwrap_or(true),
    );

    Ok(result)
}
```

- [ ] **Step 8: Verify compilation and tests**

Run: `cd src-tauri && cargo check && cargo test --lib`
Expected: compiles, all tests pass

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/commands/selection.rs
git commit -m "Add feature cache fallback for copy and properties commands"
```

---

### Task 5: Add frontend IPC wrappers

**Files:**
- Modify: `src/lib/selection-ipc.ts`

- [ ] **Step 1: Add `selectionRectFeatures` wrapper**

```typescript
export function selectionRectFeatures(
    featuresJson: string,
    bbox: [number, number, number, number],
    mode: string,
    op: SelectionRectOp,
    generation: number,
): Promise<SelectionDelta> {
    return invoke("selection_rect_features", {
        featuresJson,
        bbox,
        mode,
        op,
        generation,
    })
}
```

- [ ] **Step 2: Add `selectionCacheFeatures` wrapper**

```typescript
export function selectionCacheFeatures(featuresJson: string): Promise<void> {
    return invoke("selection_cache_features", { featuresJson })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/selection-ipc.ts
git commit -m "Add IPC wrappers for selection_rect_features and selection_cache_features"
```

---

### Task 6: Add `queryFeaturesInRect` MapLibre helper

**Files:**
- Modify: `src/lib/maplibre.ts`
- Create: `src/lib/maplibre.test.ts`

- [ ] **Step 1: Write test for feature serialization helper**

Create `src/lib/maplibre.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { serializeFeaturesForIpc } from "./maplibre"

describe("serializeFeaturesForIpc", () => {
    it("deduplicates features by id", () => {
        const features = [
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 2, geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result).toHaveLength(2)
    })

    it("drops features without numeric id", () => {
        const features = [
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
            { type: "Feature", id: "abc", geometry: { type: "Point", coordinates: [2, 2] }, properties: {} },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(1)
    })

    it("strips non-GeoJSON properties (layer, source, sourceLayer, state)", () => {
        const features = [
            {
                type: "Feature",
                id: 1,
                geometry: { type: "Point", coordinates: [0, 0] },
                properties: { name: "test" },
                layer: { id: "layer1" },
                source: "my-source",
                sourceLayer: "sl",
                state: { selected: true },
            },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result[0].layer).toBeUndefined()
        expect(result[0].source).toBeUndefined()
        expect(result[0].sourceLayer).toBeUndefined()
        expect(result[0].state).toBeUndefined()
        expect(result[0].properties.name).toBe("test")
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/lib/maplibre.test.ts`
Expected: FAIL — `serializeFeaturesForIpc` not exported

- [ ] **Step 3: Implement `serializeFeaturesForIpc` and `queryFeaturesInRect`**

Add to `src/lib/maplibre.ts`:

```typescript
import type { MapGeoJSONFeature } from "maplibre-gl"

export function queryFeaturesInRect(
    map: MaplibreMap,
    start: { x: number; y: number },
    current: { x: number; y: number },
    layers: string[],
): MapGeoJSONFeature[] {
    const bbox: [PointLike, PointLike] = [
        [Math.min(start.x, current.x), Math.min(start.y, current.y)],
        [Math.max(start.x, current.x), Math.max(start.y, current.y)],
    ]
    return map.queryRenderedFeatures(bbox, { layers })
}

export function serializeFeaturesForIpc(features: MapGeoJSONFeature[]): string {
    const seen = new Set<number>()
    const cleaned: object[] = []
    for (const f of features) {
        if (typeof f.id !== "number") continue
        if (seen.has(f.id)) continue
        seen.add(f.id)
        cleaned.push({
            type: "Feature",
            id: f.id,
            geometry: f.geometry,
            properties: f.properties,
        })
    }
    return JSON.stringify(cleaned)
}
```

Add `MapGeoJSONFeature` to the existing `maplibre-gl` import at the top of the file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/lib/maplibre.test.ts`
Expected: PASS

- [ ] **Step 5: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 6: Commit**

```bash
git add src/lib/maplibre.ts src/lib/maplibre.test.ts
git commit -m "Add queryFeaturesInRect and serializeFeaturesForIpc helpers"
```

---

### Task 7: Branch rect-select listener for MVT sources

**Files:**
- Modify: `src/store/listeners/rect-select.ts`

This is the main integration task. The listener branches on source type: MVT sources use `queryRenderedFeatures` + `selectionRectFeatures`, all others use the existing `selectionRect` path.

- [ ] **Step 1: Add imports**

Add to the imports in `rect-select.ts`:

```typescript
import { SourceType } from "@/types"
import { queryFeaturesInRect, serializeFeaturesForIpc } from "@/lib/maplibre"
import { selectionRectFeatures, selectionCacheFeatures } from "@/lib/selection-ipc"
```

(Also add `selectionRectFeatures` and `selectionCacheFeatures` to the existing import block from `@/lib/selection-ipc`.)

- [ ] **Step 2: Add helper to check if source is MVT**

Add a helper near the top of the file:

```typescript
function isMvtSource(state: RootState, sourceId: string): boolean {
    const source = state.source.items[sourceId]
    return source?.type === SourceType.MVT
}
```

- [ ] **Step 3: Update drag handler to branch on source type**

Replace the inner loop body of the `rectSelectDrag` listener (inside the `while (pendingDrag)` loop, after the dedup check):

```typescript
const generation = ++queryGeneration
let delta: SelectionDelta

if (isMvtSource(state, sourceId)) {
    const layerIds = selectPreviewLayerIds(state)
    const containerRect = map.getContainer().getBoundingClientRect()
    const screenStart = {
        x: start.x - containerRect.left,
        y: start.y - containerRect.top,
    }
    const screenCurrent = {
        x: current.x - containerRect.left,
        y: current.y - containerRect.top,
    }
    const features = queryFeaturesInRect(map, screenStart, screenCurrent, layerIds)
    const featuresJson = serializeFeaturesForIpc(features)
    delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)
} else {
    delta = await selectionRect(sourceId, bbox, mode, op, generation)
}

if (session !== dragSession) break

emitSelectionDelta(delta)
```

- [ ] **Step 4: Update commit handler to branch on source type**

Replace the `selectionRect` call in the `rectSelectCommit` listener:

```typescript
let delta: SelectionDelta

if (isMvtSource(state, sourceId)) {
    const layerIds = selectPreviewLayerIds(state)
    const containerRect = map.getContainer().getBoundingClientRect()
    const screenStart = {
        x: start.x - containerRect.left,
        y: start.y - containerRect.top,
    }
    const screenCurrent = {
        x: current.x - containerRect.left,
        y: current.y - containerRect.top,
    }
    const features = queryFeaturesInRect(map, screenStart, screenCurrent, layerIds)
    const featuresJson = serializeFeaturesForIpc(features)
    delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)
} else {
    delta = await selectionRect(sourceId, bbox, mode, op, generation)
}
```

The rest of the commit handler (apply, reconcile, sync) stays unchanged.

- [ ] **Step 5: Update click handler to cache features for MVT**

In the `rectSelectClick` listener, after the feature is found and the selection IPC call succeeds, add cache logic for MVT. Replace the feature-found branch:

```typescript
if (features.length > 0) {
    const featureId = features[0].id
    if (typeof featureId !== "number") return

    let delta: SelectionDelta
    switch (modifier) {
        case "shift": {
            delta = await selectionAdd([featureId])
            break
        }
        case "ctrl": {
            delta = await selectionRemove([featureId])
            break
        }
        default: {
            delta = await selectionSet([featureId])
            break
        }
    }
    emitSelectionDelta(delta)

    const sourceId = state.source.selectedId
    if (sourceId && isMvtSource(state, sourceId)) {
        const featuresJson = serializeFeaturesForIpc(features as unknown as MapGeoJSONFeature[])
        await selectionCacheFeatures(featuresJson)
    }
}
```

Add `MapGeoJSONFeature` to the `maplibre-gl` import.

- [ ] **Step 6: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 7: Commit**

```bash
git add src/store/listeners/rect-select.ts
git commit -m "Branch rect-select listener for MVT sources using queryRenderedFeatures"
```

---

### Task 8: Update useFeatureState for MVT sourceLayer support

**Files:**
- Modify: `src/sphere-hooks/useFeatureState.ts`

For vector tile sources, `map.setFeatureState` and `map.removeFeatureState` require a `sourceLayer` parameter. This task updates the hook to iterate source-layers when the source is MVT.

- [ ] **Step 1: Add source-layer tracking**

Update the hook to read source-layers from Redux and keep them in a ref alongside the sourceId ref:

```typescript
import { SourceType } from "@/types"

export default function useFeatureState(ref: MapRef | undefined) {
    const selectedLayerId = useAppSelector(selectors.layer.selectSelectedId)
    const selectedSourceId = useAppSelector(selectors.source.selectSelectedId)
    const layerItems = useAppSelector(state => state.layer.items)
    const sourceItems = useAppSelector(state => state.source.items)

    const sourceIdRef = useRef<string | undefined>()
    const sourceLayersRef = useRef<string[]>([])

    useEffect(() => {
        if (selectedLayerId) {
            const fromStore = layerItems[selectedLayerId]?.sourceId
            if (fromStore) {
                sourceIdRef.current = fromStore
            } else {
                const mapLayer = ref?.getMap()?.getLayer(selectedLayerId)
                sourceIdRef.current = (mapLayer as { source?: string } | undefined)?.source
            }
        } else {
            sourceIdRef.current = selectedSourceId
        }

        // Track source-layers for MVT sources
        const sid = sourceIdRef.current
        if (sid) {
            const src = sourceItems[sid]
            if (src?.type === SourceType.MVT && "sourceLayers" in src) {
                sourceLayersRef.current = src.sourceLayers.map(sl => sl.id)
                return
            }
        }
        sourceLayersRef.current = []
    }, [selectedLayerId, layerItems, selectedSourceId, sourceItems, ref])
```

- [ ] **Step 2: Update delta bus handler for sourceLayer**

Replace the delta bus `useEffect`:

```typescript
useEffect(() => {
    const unsubscribe = onSelectionDelta(delta => {
        const map = ref?.getMap()
        const sourceId = sourceIdRef.current
        if (!map || !sourceId) return

        const sourceLayers = sourceLayersRef.current
        const isVector = sourceLayers.length > 0

        for (const id of delta.removed) {
            try {
                if (isVector) {
                    for (const sl of sourceLayers) {
                        map.removeFeatureState({ source: sourceId, sourceLayer: sl, id })
                    }
                } else {
                    map.removeFeatureState({ source: sourceId, id })
                }
            } catch {
                // source may not exist on map yet
            }
        }
        for (const id of delta.added) {
            try {
                if (isVector) {
                    for (const sl of sourceLayers) {
                        map.setFeatureState({ source: sourceId, sourceLayer: sl, id }, { selected: true })
                    }
                } else {
                    map.setFeatureState({ source: sourceId, id }, { selected: true })
                }
            } catch {
                // source may not exist on map yet
            }
        }
    })

    return unsubscribe
}, [ref])
```

- [ ] **Step 3: Update reconcile bus handler for sourceLayer**

Replace the reconcile bus `useEffect`:

```typescript
useEffect(() => {
    const unsubscribe = onSelectionReconcile(({ ids, sourceId }) => {
        const map = ref?.getMap()
        const currentSourceId = sourceIdRef.current
        if (!map || !currentSourceId) return
        if (currentSourceId !== sourceId) return

        const sourceLayers = sourceLayersRef.current
        const isVector = sourceLayers.length > 0

        try {
            if (isVector) {
                for (const sl of sourceLayers) {
                    map.removeFeatureState({ source: currentSourceId, sourceLayer: sl })
                }
            } else {
                map.removeFeatureState({ source: currentSourceId })
            }
        } catch {
            // source may not exist on map yet
        }
        for (const id of ids) {
            try {
                if (isVector) {
                    for (const sl of sourceLayers) {
                        map.setFeatureState({ source: currentSourceId, sourceLayer: sl, id }, { selected: true })
                    }
                } else {
                    map.setFeatureState({ source: currentSourceId, id }, { selected: true })
                }
            } catch {
                // source may not exist on map yet
            }
        }
    })

    return unsubscribe
}, [ref])
```

- [ ] **Step 4: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 5: Run existing tests**

Run: `npm test -- --run`
Expected: all existing tests pass

- [ ] **Step 6: Commit**

```bash
git add src/sphere-hooks/useFeatureState.ts
git commit -m "Update useFeatureState to pass sourceLayer for MVT sources"
```

---

### Task 9: Verify full build

**Files:** none (verification only)

- [ ] **Step 1: Run frontend build**

Run: `npm run build`
Expected: builds successfully

- [ ] **Step 2: Run Rust build**

Run: `cd src-tauri && cargo build`
Expected: builds successfully

- [ ] **Step 3: Run all tests**

Run: `npm test -- --run && cd src-tauri && cargo test --lib`
Expected: all tests pass

- [ ] **Step 4: Run format check**

Run: `npm run format && npm run lint`
Expected: no issues

---

## Appendix: Data Flow (MVT path)

```
Mouse drag on map canvas
    → RectSelectOverlay dispatches rectSelectDrag/rectSelectCommit

rect-select listener (RTK middleware)
    → checks source type: MVT?
    ├─ NO  → selectionRect IPC (existing FeatureStore path)
    └─ YES → queryRenderedFeatures(screenBbox, previewLayerIds)
             → serializeFeaturesForIpc (dedup by ID, strip MapLibre props)
             → selectionRectFeatures IPC
                → Rust: parse features, merge into feature_cache
                → Rust: build temp FeatureStore, query_rect(geoBbox, mode)
                → Rust: update SelectionState (set/preview/add)
                → return SelectionDelta

    → emitSelectionDelta(delta)
        → useFeatureState: for each sourceLayer, set/removeFeatureState

    On commit:
    → selectionApply → selectionGetIds → emitSelectionReconcile
    → dispatch selection.sync + selection.apply

    Copy/Properties (later, on user action):
    → selection_copy_geojson / selection_copy_wkt / selection_query_page
    → source has no FeatureStore → falls back to feature_cache
    → builds FeatureCollection from cached features filtered by selected IDs
```
