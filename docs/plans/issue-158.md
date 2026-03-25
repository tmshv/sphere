# Rect Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rubber-band rect select tool to the map (Sources tab only) that selects multiple features using include/intersect modes, highlights them via MapLibre feature-state, and syncs selection to both the PropertiesPopup and the separate properties table window.

**Architecture:** A transparent overlay div captures drag input; geometry intersection runs in Rust (`FeatureStore::query_rect` using the `geo` crate's `Contains`/`Intersects` traits with an rstar pre-filter); Redux `selectionSlice` drives a new `useFeatureState` hook that replaces the existing filter-based highlight system with MapLibre `feature-state`.

**Tech Stack:** React 18, Redux Toolkit, MapLibre GL 5, react-map-gl 8, Mantine 5, Tauri 2, Rust (`geo` 0.27, `geojson` 0.24, `rstar` 0.12)

**Spec:** `docs/superpowers/specs/2026-03-23-rect-select-design.md`

---

## File Map

| File | Role |
|------|------|
| `crates/libsphere/src/store.rs` | Add `query_rect` method; remove `#[allow(dead_code)]` on `index` field |
| `src-tauri/src/commands/source.rs` | Add `source_query_rect` Tauri command |
| `src-tauri/src/main.rs` | Register `source_query_rect` in `invoke_handler` |
| `src/store/selection/index.ts` | Add `selectMany`; update `selectOne` to clear `sourceId` |
| `src/store/selection/index.test.ts` | Tests for new actions |
| `src/components/SphereMap/SphereSource.tsx` | Add `promoteId="id"` to GeoJSON source declarations |
| `src/const.ts`                            | Add `FEATURE_HIGHLIGHT_COLOR` shared constant         |
| `src/components/SphereMap/PointLayer.tsx` | Replace `-selected` sublayer with feature-state paint |
| `src/components/SphereMap/ShpereLineStringLayer.tsx` | Replace `-selected` sublayer with feature-state paint |
| `src/components/SphereMap/SpherePolygonLayer.tsx` | Replace `-selected` sublayer with feature-state paint |
| `src/sphere-hooks/useFeatureState.ts`      | New hook: drives `setFeatureState` from Redux selection |
| `src/sphere-hooks/useFeatureState.test.ts` | Tests for `useFeatureState`                             |
| `src/store/listeners/select-features.ts` | Deleted |
| `src/store/listeners/clear-selection.ts` | Replace `setFilter` with `removeFeatureState` |
| `src/store/listeners/selection-changed.ts` | New listener: fetch properties for popup + emit event to table window |
| `src/store/listeners/index.ts` | Remove `selectFeatures`; add `selectionChanged` |
| `src/store/index.ts` | Remove `selectFeatures` middleware; add `selectionChanged` |
| `src/store/app.ts` | Add `mapTool: "pan" \| "select"` field and actions |
| `src/store/app.test.ts` | Tests for new `mapTool` actions |
| `src/components/SphereMap/MapToolbar.tsx` | New floating Pan/Select toolbar |
| `src/components/SphereMap/RectSelectOverlay.tsx` | New rubber-band rect overlay |
| `src/components/SphereMap/map-body.tsx` | Mount toolbar, overlay; call `useFeatureState` |
| `src/sphere-hooks/useFeatureSelect.ts`      | Gate: no-op when `mapTool === "select"` |
| `src/sphere-hooks/useFeatureSelect.test.ts` | Tests for `useFeatureSelect` gate       |
| `src/store/source/showProperties.ts` | Relax guard to allow `FeatureCollection` sources |
| `src/properties.tsx` | Add All/Selected toggle; listen for `properties-selection-changed` |

---

### Task 1: `FeatureStore::query_rect` in Rust

**Files:**
- Modify: `crates/libsphere/src/store.rs`

- [x] **Step 1: Write failing tests for `query_rect`**

Add to the `#[cfg(test)]` block in `crates/libsphere/src/store.rs`:

```rust
#[test]
fn test_query_rect_include_point_inside() {
    use geojson::{Feature, Geometry, Value as GeoValue};
    let features = vec![
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![1.0, 1.0]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
            properties: None,
            foreign_members: None,
        },
        Feature {
            bbox: None,
            geometry: Some(Geometry::new(GeoValue::Point(vec![5.0, 5.0]))),
            id: Some(geojson::feature::Id::Number(serde_json::Number::from(2))),
            properties: None,
            foreign_members: None,
        },
    ];
    let store = FeatureStore::from_features(features);
    let result = store.query_rect([0.0, 0.0, 2.0, 2.0], "include");
    assert_eq!(result, vec![1i64]);
}

#[test]
fn test_query_rect_include_point_outside() {
    use geojson::{Feature, Geometry, Value as GeoValue};
    let features = vec![Feature {
        bbox: None,
        geometry: Some(Geometry::new(GeoValue::Point(vec![5.0, 5.0]))),
        id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
        properties: None,
        foreign_members: None,
    }];
    let store = FeatureStore::from_features(features);
    let result = store.query_rect([0.0, 0.0, 2.0, 2.0], "include");
    assert!(result.is_empty());
}

#[test]
fn test_query_rect_intersect_line_crossing() {
    use geojson::{Feature, Geometry, Value as GeoValue};
    // Line from (0.5, -1) to (0.5, 3) crosses the bbox (0,0,2,2)
    let features = vec![Feature {
        bbox: None,
        geometry: Some(Geometry::new(GeoValue::LineString(vec![
            vec![0.5, -1.0],
            vec![0.5, 3.0],
        ]))),
        id: Some(geojson::feature::Id::Number(serde_json::Number::from(1))),
        properties: None,
        foreign_members: None,
    }];
    let store = FeatureStore::from_features(features);
    // include: line extends outside bbox → not included
    assert!(store.query_rect([0.0, 0.0, 2.0, 2.0], "include").is_empty());
    // intersect: line crosses bbox → selected
    assert_eq!(store.query_rect([0.0, 0.0, 2.0, 2.0], "intersect"), vec![1i64]);
}

#[test]
fn test_query_rect_empty_store() {
    let store = FeatureStore::from_features(vec![]);
    assert!(store.query_rect([0.0, 0.0, 10.0, 10.0], "include").is_empty());
    assert!(store.query_rect([0.0, 0.0, 10.0, 10.0], "intersect").is_empty());
}

#[test]
fn test_query_rect_feature_without_id_excluded() {
    use geojson::{Feature, Geometry, Value as GeoValue};
    let features = vec![Feature {
        bbox: None,
        geometry: Some(Geometry::new(GeoValue::Point(vec![1.0, 1.0]))),
        id: None, // no id
        properties: None,
        foreign_members: None,
    }];
    let store = FeatureStore::from_features(features);
    // Feature has no id — cannot be selected
    assert!(store.query_rect([0.0, 0.0, 2.0, 2.0], "include").is_empty());
}
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
cd src-tauri && cargo test -p libsphere -- store::tests::test_query_rect 2>&1 | grep -E "FAILED|error|test_query_rect"
```

Expected: compile error or `test_query_rect` functions not found.

- [x] **Step 3: Implement `query_rect` on `FeatureStore`**

In `crates/libsphere/src/store.rs`, add at the top of the file:
```rust
use geo::{Contains, Intersects};
```

Remove `#[allow(dead_code)]` from the `index` field:
```rust
// Before:
#[allow(dead_code)] // reserved for future bbox spatial queries
index: Box<dyn SpatialIndex>,

// After:
index: Box<dyn SpatialIndex>,
```

Add the method to `impl FeatureStore`:
```rust
/// Returns IDs of features that match the given rect and mode.
/// mode: "include" = feature fully inside rect, "intersect" = feature touches rect.
pub fn query_rect(&self, bbox: [f64; 4], mode: &str) -> Vec<i64> {
    let [west, south, east, north] = bbox;
    let rect = geo::Rect::new(
        geo::coord! { x: west, y: south },
        geo::coord! { x: east, y: north },
    );
    let candidates = self.index.query_bbox((west, south, east, north));
    let mut result = Vec::new();
    for idx in candidates {
        let feature = &self.features[idx];
        let id = match &feature.id {
            Some(geojson::feature::Id::Number(n)) => match n.as_i64() {
                Some(v) => v,
                None => continue,
            },
            _ => continue,
        };
        let geometry = match &feature.geometry {
            Some(g) => g,
            None => continue,
        };
        let geo_geom: geo::Geometry<f64> = match geo::Geometry::try_from(geometry) {
            Ok(g) => g,
            Err(_) => continue,
        };
        let matches = match mode {
            "include" => rect.contains(&geo_geom),
            "intersect" => rect.intersects(&geo_geom),
            _ => false,
        };
        if matches {
            result.push(id);
        }
    }
    result.sort();
    result
}
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
cd src-tauri && cargo test -p libsphere -- store::tests::test_query_rect 2>&1 | grep -E "ok|FAILED|error"
```

Expected: all `test_query_rect_*` tests show `ok`.

- [x] **Step 5: Commit**

```bash
git add crates/libsphere/src/store.rs
git commit -m "Add FeatureStore::query_rect with include/intersect modes"
```

---

### Task 2: `source_query_rect` Tauri IPC command

**Files:**
- Modify: `src-tauri/src/commands/source.rs`
- Modify: `src-tauri/src/main.rs`

- [x] **Step 1: Add the command to `source.rs`**

At the end of `src-tauri/src/commands/source.rs`, add:

```rust
#[tauri::command]
pub async fn source_query_rect(
    id: String,
    bbox: [f64; 4],
    mode: String,
    storage: State<'_, SourceStorage>,
) -> Result<Vec<i64>, String> {
    let fs = {
        let store = storage.store.lock().unwrap();
        let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
        entry.store.as_ref().ok_or_else(|| "No feature store for this source".to_string())?.clone()
    };
    Ok(fs.query_rect(bbox, &mode))
}
```

Note the Arc clone pattern: `fs` is cloned inside the block so the Mutex guard drops before `query_rect` runs.

- [x] **Step 2: Register the command in `main.rs`**

In `src-tauri/src/main.rs`, add to `tauri::generate_handler!`:

```rust
commands::source::source_query_rect,
```

- [x] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo build 2>&1 | grep -E "error|warning\[" | head -20
```

Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src-tauri/src/commands/source.rs src-tauri/src/main.rs
git commit -m "Add source_query_rect Tauri IPC command"
```

---

### Task 3: `selectionSlice` — `selectMany` + `selectOne` fix

**Files:**
- Modify: `src/store/selection/index.ts`
- Modify: `src/store/selection/index.test.ts`

- [x] **Step 1: Write failing tests**

Add to `src/store/selection/index.test.ts`:

```ts
test("selectOne clears sourceId", () => {
    const prev = { sourceId: "s1", layerId: undefined, selectedIds: [] }
    const state = reducer(prev, selectOne({ layerId: "l1", featureId: 42 }))
    expect(state.sourceId).toBeUndefined()
    expect(state.layerId).toBe("l1")
    expect(state.selectedIds).toEqual([42])
})

test("selectMany sets sourceId, clears layerId, sets selectedIds", () => {
    const prev = { sourceId: undefined, layerId: "l1", selectedIds: [1] }
    const state = reducer(prev, selectMany({ sourceId: "s2", featureIds: [10, 20] }))
    expect(state.sourceId).toBe("s2")
    expect(state.layerId).toBeUndefined()
    expect(state.selectedIds).toEqual([10, 20])
})

test("selectMany and selectOne are mutually exclusive", () => {
    // After selectMany, selectOne clears sourceId
    let state = reducer(undefined, selectMany({ sourceId: "s1", featureIds: [1, 2] }))
    state = reducer(state, selectOne({ layerId: "l1", featureId: 5 }))
    expect(state.sourceId).toBeUndefined()
    expect(state.layerId).toBe("l1")
})

test("reset clears layerId, sourceId, and selectedIds", () => {
    const prev = { sourceId: "s1", layerId: "l1", selectedIds: [1, 2] }
    const state = reducer(prev, reset())
    expect(state.sourceId).toBeUndefined()
    expect(state.layerId).toBeUndefined()
    expect(state.selectedIds).toEqual([])
})
```

Also update the import line at the top:
```ts
const { reset, selectSource, selectLayer, selectOne, selectMany } = selectionSlice.actions
```

- [x] **Step 2: Run tests to confirm failures**

```bash
npm test -- src/store/selection/index.test.ts 2>&1 | grep -E "FAIL|selectMany|selectOne clears"
```

Expected: `selectMany` not found, `selectOne clears sourceId` fails.

- [x] **Step 3: Update `selectionSlice`**

In `src/store/selection/index.ts`, update `selectOne` and add `selectMany`:

```ts
// NOTE: reset now also clears layerId (was previously not cleared).
// This is intentional: the spec (§4c) defines reset as "stronger than resetFeature,
// clears sourceId and layerId too". The existing code omitted layerId — this is a bug fix.
reset: state => {
    state.layerId = undefined
    state.sourceId = undefined
    state.selectedIds = []
},
selectOne: (state, action: PayloadAction<{ layerId: Id; featureId: number }>) => {
    state.layerId = action.payload.layerId
    state.sourceId = undefined
    state.selectedIds = [action.payload.featureId]
},
selectMany: (state, action: PayloadAction<{ sourceId: Id; featureIds: number[] }>) => {
    state.sourceId = action.payload.sourceId
    state.layerId = undefined
    state.selectedIds = action.payload.featureIds
},
```

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/store/selection/index.test.ts 2>&1 | grep -E "PASS|FAIL"
```

Expected: PASS

- [x] **Step 5: Format and commit**

```bash
npm run format
git add src/store/selection/index.ts src/store/selection/index.test.ts
git commit -m "Add selectMany action and fix selectOne to clear sourceId"
```

---

### Task 4: `promoteId` on GeoJSON sources

**Files:**
- Modify: `src/components/SphereMap/SphereSource.tsx`

- [x] **Step 1: Add `promoteId="id"` to both GeoJSON source branches**

In `src/components/SphereMap/SphereSource.tsx`, update `FeatureCollection` and `Geojson` branches:

```tsx
// FeatureCollection branch (around line 78):
<Source id={id} type="geojson" data={source.dataset ?? (EMPTY_GEOJSON as GeoJSON.FeatureCollection)} promoteId="id" />

// Geojson branch (around line 83):
<Source id={id} type="geojson" data={geojsonData} promoteId="id" />
```

> **Note**: `EMPTY_GEOJSON as GeoJSON.FeatureCollection` is a pre-existing cast in this file — do not introduce it; just preserve it as-is when adding `promoteId`. Fixing the cast is out of scope for this task.

MVT and Raster branches are unchanged.

- [x] **Step 2: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

Expected: no TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add src/components/SphereMap/SphereSource.tsx
git commit -m "Add promoteId=\"id\" to GeoJSON sources for feature-state support"
```

---

### Task 5: Feature-state paint refactor — layer components

**Files:**
- Modify: `src/components/SphereMap/PointLayer.tsx`
- Modify: `src/components/SphereMap/ShpereLineStringLayer.tsx`
- Modify: `src/components/SphereMap/SpherePolygonLayer.tsx`

The highlight color is `#00E5FF` (cyan). Add it to `src/const.ts` as a shared constant (exported alongside other app-wide constants):
```ts
export const FEATURE_HIGHLIGHT_COLOR = "#00E5FF"
```

Import `FEATURE_HIGHLIGHT_COLOR` from `@/const` in each layer component instead of defining it locally. This prevents the value from drifting across files.

The `let`/`var` pattern for feature-state paint:
```ts
// For a property like circle-color:
["let", "sel", ["boolean", ["feature-state", "selected"], false],
  ["case", ["var", "sel"], FEATURE_HIGHLIGHT_COLOR, color]
]
```

- [x] **Step 1: Add `FEATURE_HIGHLIGHT_COLOR` to `src/const.ts`**

```ts
export const FEATURE_HIGHLIGHT_COLOR = "#00E5FF"
```

- [x] **Step 2: Update `PointLayer.tsx`**

Remove the `selected` paint object and the `${layerId}-selected` `<Layer>`. Import the constant and update the circle paint to use feature-state:

```tsx
import { FEATURE_HIGHLIGHT_COLOR } from "@/const"

// In useMemo, remove `selected`, update circle:
const circle: CirclePaint = {
    "circle-color": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], FEATURE_HIGHLIGHT_COLOR, color],
    ],
    "circle-radius": radius,
    "circle-stroke-color": "white",
    "circle-stroke-width": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], 3, 1],
    ],
}

// Return only [circle] from useMemo (not [circle, selected])

// In JSX: remove the ${layerId}-selected <Layer> entirely
// Keep only the main <Layer id={layerId} ...>
```

- [x] **Step 3: Update `ShpereLineStringLayer.tsx`**

Remove the `selected` paint and the `${layerId}-selected` `<Layer>`. Import the constant and update the main line paint:

```tsx
import { FEATURE_HIGHLIGHT_COLOR } from "@/const"

// In useMemo, remove `selected`, update line:
const line: LinePaint = {
    "line-color": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], FEATURE_HIGHLIGHT_COLOR, color],
    ],
    "line-width": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], thick ? 4 : 3, thick ? 2 : 1],
    ],
}

// Remove ${layerId}-selected <Layer> entirely
```

- [x] **Step 4: Update `SpherePolygonLayer.tsx`**

Remove the `selected` paint and the `${layerId}-selected` `<Layer>`. Import the constant and update the outline-1 layer to change color on selection:

```tsx
import { FEATURE_HIGHLIGHT_COLOR } from "@/const"

// Update outline-1 to use feature-state color:
const outline1: LinePaint = {
    "line-color": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], FEATURE_HIGHLIGHT_COLOR, color],
    ],
    "line-width": [
        "let", "sel", ["boolean", ["feature-state", "selected"], false],
        ["case", ["var", "sel"], 3, 1],
    ],
}

// Remove ${layerId}-selected <Layer> entirely
```

- [x] **Step 5: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

Expected: no errors.

- [x] **Step 6: Commit**

```bash
git add src/const.ts src/components/SphereMap/PointLayer.tsx src/components/SphereMap/ShpereLineStringLayer.tsx src/components/SphereMap/SpherePolygonLayer.tsx
git commit -m "Replace filter-based selection sublayers with feature-state paint"
```

---

### Task 6: `useFeatureState` hook

**Files:**
- Create: `src/sphere-hooks/useFeatureState.ts`
- Modify: `src/components/SphereMap/map-body.tsx`

- [x] **Step 1: Write failing test for `useFeatureState`**

Add `src/sphere-hooks/useFeatureState.test.ts`. The test wraps the hook with a real Redux store pre-seeded with `selectedIds` and `sourceId` so we can assert `setFeatureState` calls:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useFeatureState from "./useFeatureState"

// Minimal slices: only the fields useFeatureState reads
const makeStore = (selectedIds: number[], sourceId: string | undefined, layerId: string | undefined) =>
    configureStore({
        reducer: {
            selection: () => ({ selectedIds, sourceId, layerId }),
            layer: () => ({ items: {} }),
        },
    })

type MockMap = {
    setFeatureState: ReturnType<typeof vi.fn>
    removeFeatureState: ReturnType<typeof vi.fn>
}

type MockMapRef = { getMap: () => MockMap }

const makeMapRef = (map: MockMap): MockMapRef => ({
    getMap: () => map,
})

const wrapper =
    (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) =>
        <Provider store={store}>{children}</Provider>

describe("useFeatureState", () => {
    it("calls setFeatureState for each selected id when sourceId is set", () => {
        const map: MockMap = { setFeatureState: vi.fn(), removeFeatureState: vi.fn() }
        const store = makeStore([1, 2], "src1", undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        expect(map.setFeatureState).toHaveBeenCalledTimes(2)
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 1 }, { selected: true })
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 2 }, { selected: true })
    })

    it("does not call setFeatureState when selectedIds is empty", () => {
        const map: MockMap = { setFeatureState: vi.fn(), removeFeatureState: vi.fn() }
        const store = makeStore([], "src1", undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        expect(map.setFeatureState).not.toHaveBeenCalled()
    })
})
```

- [x] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/sphere-hooks/useFeatureState.test.ts
```

Expected: FAIL with "Cannot find module './useFeatureState'"

- [x] **Step 3: Create `useFeatureState.ts`**

```ts
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { useEffect, useRef } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type PrevSource = { sourceId: string; ids: number[] } | null

export default function useFeatureState(ref: MapRef | undefined) {
    const selectedIds = useAppSelector(state => state.selection.selectedIds)
    const layerId = useAppSelector(selectors.selection.currentLayerId)
    const selectionSourceId = useAppSelector(selectors.selection.currentSourceId)
    const layerItems = useAppSelector(state => state.layer.items)

    const sourceId =
        layerId !== undefined
            ? layerItems[layerId]?.sourceId
            : selectionSourceId

    const prevSource = useRef<PrevSource>(null)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        // Clear previous highlights
        const prev = prevSource.current
        if (prev) {
            map.removeFeatureState({ source: prev.sourceId })
        }

        // Apply new highlights
        if (selectedIds.length > 0 && sourceId) {
            for (const id of selectedIds) {
                map.setFeatureState({ source: sourceId, id }, { selected: true })
            }
            prevSource.current = { sourceId, ids: selectedIds }
        } else {
            prevSource.current = null
        }
    }, [ref, selectedIds, layerId, selectionSourceId, sourceId])
}
```

- [x] **Step 4: Run test to confirm it passes**

```bash
npm test -- src/sphere-hooks/useFeatureState.test.ts
```

Expected: PASS

- [x] **Step 5: Wire into `map-body.tsx`**

In `src/components/SphereMap/map-body.tsx`, add the import and hook call:

```tsx
import useFeatureState from "@/sphere-hooks/useFeatureState"

// Inside MapBody, after other hooks:
useFeatureState(map)
```

- [x] **Step 6: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 7: Commit**

```bash
git add src/sphere-hooks/useFeatureState.ts src/sphere-hooks/useFeatureState.test.ts src/components/SphereMap/map-body.tsx
git commit -m "Add useFeatureState hook for feature-state based selection highlight"
```

---

### Task 7: Remove `select-features` listener; update `clear-selection`

**Files:**
- Delete: `src/store/listeners/select-features.ts`
- Modify: `src/store/listeners/clear-selection.ts`
- Modify: `src/store/listeners/index.ts`
- Modify: `src/store/index.ts`

- [x] **Step 1: Update `clear-selection.ts`**

Replace the body of the listener effect:

```ts
import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.reset,
    effect: async (_, listenerApi) => {
        const map = getMap(MAP_ID)
        if (!map) {
            return
        }
        // `as RootState` follows the established project-wide listener pattern
        // (all listeners in src/store/listeners/ use this cast — pre-existing technical debt)
        const state = listenerApi.getOriginalState() as RootState
        const sourceId =
            state.selection.sourceId ??
            (state.selection.layerId
                ? state.layer.items[state.selection.layerId]?.sourceId
                : undefined)
        if (sourceId) {
            map.removeFeatureState({ source: sourceId })
        }
    },
})

export default listener
```

- [x] **Step 2: Remove `select-features.ts`**

Delete the file:
```bash
rm src/store/listeners/select-features.ts
```

- [x] **Step 3: Update `listeners/index.ts`**

Remove the `selectFeatures` export; add `selectionChanged` (to be created in Task 11):

```ts
// Remove this line:
export { default as selectFeatures } from "./select-features"
// (leave selectionChanged for Task 11)
```

- [x] **Step 4: Update `store/index.ts`**

Remove `.prepend(listeners.selectFeatures.middleware)` from the middleware chain. Leave a comment for `selectionChanged` to be added in Task 11.

- [x] **Step 5: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 6: Commit**

```bash
git add src/store/listeners/clear-selection.ts src/store/listeners/index.ts src/store/index.ts
git rm src/store/listeners/select-features.ts
git commit -m "Replace select-features listener with useFeatureState hook"
```

---

### Task 8: `mapTool` state + `MapToolbar` component

**Files:**
- Modify: `src/store/app.ts`
- Modify: `src/store/app.test.ts`
- Create: `src/components/SphereMap/MapToolbar.tsx`
- Modify: `src/components/SphereMap/map-body.tsx`

- [x] **Step 1: Write failing tests for `mapTool`**

Add to `src/store/app.test.ts` (create if missing):

```ts
import { describe, expect, test } from "vitest"
import reducer, { appSlice } from "./app"

const { setMapTool } = appSlice.actions

describe("app slice mapTool", () => {
    test("default mapTool is pan", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.mapTool).toBe("pan")
    })

    test("setMapTool changes to select", () => {
        const state = reducer(undefined, setMapTool("select"))
        expect(state.mapTool).toBe("select")
    })

    test("setMapTool changes back to pan", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), mapTool: "select" as const }
        const state = reducer(prev, setMapTool("pan"))
        expect(state.mapTool).toBe("pan")
    })
})
```

- [x] **Step 2: Run tests to confirm failure**

```bash
npm test -- src/store/app.test.ts 2>&1 | grep -E "FAIL|setMapTool"
```

- [x] **Step 3: Add `mapTool` to `app.ts`**

In `src/store/app.ts`, add to `AppState` and `initialState`, and add a `setMapTool` reducer:

```ts
// In AppState:
mapTool: "pan" | "select"

// In initialState:
mapTool: "pan",

// In reducers:
setMapTool: (state, action: PayloadAction<"pan" | "select">) => {
    state.mapTool = action.payload
},
```

Also add a selector:
```ts
export const selectMapTool = (state: RootState) => state.app.mapTool
```

**Important**: Adding `mapTool` as a required field to `AppState` will cause TypeScript errors in the existing `app.test.ts` partial state objects (they all lack `mapTool`). Update each `prev` object in `app.test.ts` by spreading the initial state and overriding the tested field:

```ts
// Replace bare object literals like:
const prev = { version: "", zenMode: true, darkTheme: false, showAttribution: false,
    showLeftSidebar: true, showRightSidebar: true, activeSidebarTab: "sources" as const }

// With a spread-based approach:
const prev = { ...reducer(undefined, { type: "@@INIT" }), zenMode: true }
```

Apply this pattern to all 5 existing `prev` objects in the `appSlice reducer` describe block.

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/store/app.test.ts 2>&1 | grep -E "PASS|FAIL"
```

- [x] **Step 5: Create `MapToolbar.tsx`**

```tsx
import { actions } from "@/store"
import { selectActiveSidebarTab, selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { ActionIcon, Group } from "@mantine/core"
import { IconHandMove, IconRectangle } from "@tabler/icons"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export type MapToolbarProps = {
    mapRef: MapRef | undefined
}

export default function MapToolbar({ mapRef }: MapToolbarProps) {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)
    const activeTab = useAppSelector(selectActiveSidebarTab)

    // Sync dragPan with tool state
    useEffect(() => {
        const map = mapRef?.getMap()
        if (!map) {
            return
        }
        if (mapTool === "select") {
            map.dragPan.disable()
        } else {
            map.dragPan.enable()
        }
    }, [mapRef, mapTool])

    // Escape key returns to pan
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                dispatch(actions.app.setMapTool("pan"))
            }
        }
        window.addEventListener("keydown", handler)
        return () => {
            window.removeEventListener("keydown", handler)
        }
    }, [dispatch])

    if (activeTab !== "sources") {
        return null
    }

    return (
        <Group
            spacing={4}
            style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                padding: "4px",
            }}
        >
            <ActionIcon
                size="md"
                variant={mapTool === "pan" ? "filled" : "subtle"}
                title="Pan"
                onClick={() => dispatch(actions.app.setMapTool("pan"))}
            >
                <IconHandMove size={16} />
            </ActionIcon>
            <ActionIcon
                size="md"
                variant={mapTool === "select" ? "filled" : "subtle"}
                title="Rect Select"
                onClick={() => dispatch(actions.app.setMapTool("select"))}
            >
                <IconRectangle size={16} />
            </ActionIcon>
        </Group>
    )
}
```

- [x] **Step 6: Mount `MapToolbar` in `map-body.tsx`**

Add import and render inside `MapBody`:

```tsx
import MapToolbar from "./MapToolbar"

// In JSX, add before the closing fragment:
<MapToolbar mapRef={map} />
```

- [x] **Step 7: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 8: Commit**

```bash
git add src/store/app.ts src/store/app.test.ts src/components/SphereMap/MapToolbar.tsx src/components/SphereMap/map-body.tsx
git commit -m "Add mapTool state and MapToolbar floating component"
```

---

### Task 9: `RectSelectOverlay`

**Files:**
- Create: `src/components/SphereMap/RectSelectOverlay.tsx`
- Modify: `src/components/SphereMap/map-body.tsx`

- [x] **Step 1: Create `RectSelectOverlay.tsx`**

```tsx
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useRef, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type Point = { x: number; y: number }

const RECT_FILL_ALPHA = "18"  // hex alpha ~10% opacity
const THROTTLE_MS = 50

export type RectSelectOverlayProps = {
    mapRef: MapRef | undefined
}

export default function RectSelectOverlay({ mapRef }: RectSelectOverlayProps) {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)
    const sourceId = useAppSelector(selectors.selection.currentSourceId)

    const [dragStart, setDragStart] = useState<Point | null>(null)
    const [dragCurrent, setDragCurrent] = useState<Point | null>(null)
    const lastThrottle = useRef(0)

    const queryAndSelect = useCallback(
        async (start: Point, current: Point, source: string) => {
            const map = mapRef?.getMap()
            if (!map) {
                return
            }
            const mode = current.x >= start.x ? "include" : "intersect"
            const sw = map.unproject([Math.min(start.x, current.x), Math.max(start.y, current.y)])
            const ne = map.unproject([Math.max(start.x, current.x), Math.min(start.y, current.y)])
            const bbox: [number, number, number, number] = [sw.lng, sw.lat, ne.lng, ne.lat]
            const featureIds = await invoke<number[]>("source_query_rect", {
                id: source,
                bbox,
                mode,
            })
            dispatch(actions.selection.selectMany({ sourceId: source, featureIds }))
        },
        [dispatch, mapRef],
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!sourceId) {
                return
            }
            setDragStart({ x: e.clientX, y: e.clientY })
            setDragCurrent({ x: e.clientX, y: e.clientY })
        },
        [sourceId],
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) {
                return
            }
            const current = { x: e.clientX, y: e.clientY }
            setDragCurrent(current)
            const now = Date.now()
            if (now - lastThrottle.current < THROTTLE_MS) {
                return
            }
            lastThrottle.current = now
            queryAndSelect(dragStart, current, sourceId).catch(() => {
                dispatch(actions.selection.reset())
            })
        },
        [dragStart, sourceId, queryAndSelect],
    )

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            if (!dragStart || !sourceId) {
                return
            }
            const current = { x: e.clientX, y: e.clientY }
            queryAndSelect(dragStart, current, sourceId).catch(() => {
                dispatch(actions.selection.reset())
            })
            setDragStart(null)
            setDragCurrent(null)
        },
        [dragStart, sourceId, queryAndSelect],
    )

    if (mapTool !== "select") {
        return null
    }

    const rectStyle: React.CSSProperties = (() => {
        if (!dragStart || !dragCurrent) {
            return { display: "none" }
        }
        const isInclude = dragCurrent.x >= dragStart.x
        const left = Math.min(dragStart.x, dragCurrent.x)
        const top = Math.min(dragStart.y, dragCurrent.y)
        const width = Math.abs(dragCurrent.x - dragStart.x)
        const height = Math.abs(dragCurrent.y - dragStart.y)
        return {
            position: "fixed",
            left,
            top,
            width,
            height,
            border: `2px ${isInclude ? "solid" : "dashed"} ${FEATURE_HIGHLIGHT_COLOR}`,
            background: `${FEATURE_HIGHLIGHT_COLOR}${RECT_FILL_ALPHA}`,
            pointerEvents: "none",
        }
    })()

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    cursor: "crosshair",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
            <div style={rectStyle} />
        </>
    )
}
```

- [x] **Step 2: Mount `RectSelectOverlay` in `map-body.tsx`**

Add import and render:

```tsx
import RectSelectOverlay from "./RectSelectOverlay"

// In JSX:
<RectSelectOverlay mapRef={map} />
```

- [x] **Step 3: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 4: Commit**

```bash
git add src/components/SphereMap/RectSelectOverlay.tsx src/components/SphereMap/map-body.tsx
git commit -m "Add RectSelectOverlay rubber-band rect for multi-select"
```

---

### Task 10: Gate `useFeatureSelect` in select mode

**Files:**
- Modify: `src/sphere-hooks/useFeatureSelect.ts`
- Create: `src/sphere-hooks/useFeatureSelect.test.ts`

- [x] **Step 1: Write failing tests**

`useFeatureSelect.ts` has no existing test file. Create `src/sphere-hooks/useFeatureSelect.test.ts`:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useFeatureSelect from "./useFeatureSelect"

const makeStore = (mapTool: "pan" | "select") =>
    configureStore({
        reducer: {
            // app.activeSidebarTab needed by selectors.preview.layerIds
            app: () => ({ mapTool, activeSidebarTab: "layers" as const }),
            // layer.items + layer.allIds needed by selectors.layer.visibleIds
            layer: () => ({ items: {}, allIds: [] }),
            // selection + source needed by selectors.preview.layerIds (no preview Redux slice exists)
            selection: () => ({ sourceId: undefined, layerId: undefined, selectedIds: [] }),
            source: () => ({ items: {} }),
        },
    })

const makeMapRef = (onFn = vi.fn()) =>
    ({ getMap: () => ({ on: onFn }) }) as never

const wrapper =
    (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) =>
        <Provider store={store}>{children}</Provider>

describe("useFeatureSelect", () => {
    it("registers a click listener when mapTool is pan", () => {
        const onFn = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
        const store = makeStore("pan")
        renderHook(() => useFeatureSelect(makeMapRef(onFn)), { wrapper: wrapper(store) })
        expect(onFn).toHaveBeenCalledWith("click", expect.any(Function))
    })

    it("does not register a click listener when mapTool is select", () => {
        const onFn = vi.fn()
        const store = makeStore("select")
        renderHook(() => useFeatureSelect(makeMapRef(onFn)), { wrapper: wrapper(store) })
        expect(onFn).not.toHaveBeenCalled()
    })
})
```

- [x] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/sphere-hooks/useFeatureSelect.test.ts
```

Expected: both tests fail — the hook does not yet read `mapTool` from the store.

- [x] **Step 3: Add the `mapTool` guard**

Replace the body of `src/sphere-hooks/useFeatureSelect.ts` with:

```ts
import { queryFeaturesInPoint } from "@/lib/maplibre"
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectors.preview.layerIds],
    (layerIds, previewLayerIds) => (previewLayerIds.length > 0 ? [...layerIds, ...previewLayerIds] : layerIds),
)

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const mapTool = useAppSelector(selectMapTool)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || mapTool === "select") {
            return
        }

        const click = map.on("click", event => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)
            if (features.length > 0) {
                const f = features[0]
                const featureId = f.id
                if (typeof featureId !== "number") {
                    return
                }
                dispatch(actions.selection.selectOne({ layerId: f.layer.id, featureId }))
                return
            }
            dispatch(actions.selection.resetFeature())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, mapTool])

    return null
}
```

The guard is placed before `map.on(...)` so no listener is registered when `mapTool === "select"`, meaning there is nothing to unsubscribe — returning `undefined` is correct. `mapTool` is added to the dependency array so the effect re-runs when the tool changes.

- [x] **Step 4: Run tests to confirm they pass**

```bash
npm test -- src/sphere-hooks/useFeatureSelect.test.ts
```

Expected: PASS

- [x] **Step 5: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 6: Commit**

```bash
git add src/sphere-hooks/useFeatureSelect.ts src/sphere-hooks/useFeatureSelect.test.ts
git commit -m "Gate useFeatureSelect: no-op in select tool mode"
```

---

### Task 11: Properties listeners + `showProperties` guard fix

**Files:**
- Create: `src/store/listeners/selection-changed.ts`
- Modify: `src/store/listeners/index.ts`
- Modify: `src/store/index.ts`
- Modify: `src/store/source/showProperties.ts`

- [x] **Step 1: Create `selection-changed.ts`**

This listener serves two roles:
1. On `selectMany`: fetch properties for the PropertiesPopup overlay
2. On any selection change: notify the properties table window

```ts
import { actions } from "@/store"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { invoke } from "@tauri-apps/api/core"
import { emit } from "@tauri-apps/api/event"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"

const listener = createListenerMiddleware()

// Notify properties table window on any selection change
const notifyPropertiesWindow = async (sourceId: string | undefined, selectedIds: number[]) => {
    if (!sourceId) {
        return
    }
    const win = await WebviewWindow.getByLabel("sphere-properties")
    if (!win) {
        return
    }
    await emit("properties-selection-changed", { sourceId, selectedIds })
}

// On selectMany: populate PropertiesPopup + notify table window
listener.startListening({
    actionCreator: actions.selection.selectMany,
    effect: async (action, listenerApi) => {
        const { sourceId, featureIds } = action.payload
        const dispatch = listenerApi.dispatch

        // Notify table window
        await notifyPropertiesWindow(sourceId, featureIds)

        if (featureIds.length === 0) {
            dispatch(actions.properties.reset())
            return
        }

        // Fetch properties for PropertiesPopup using source_query_page with ID filter
        try {
            const filterJson = JSON.stringify(["in", ["id"], ["literal", featureIds]])
            const result = await invoke<{ features: Record<string, unknown>[] }>(
                "source_query_page",
                { id: sourceId, offset: 0, limit: featureIds.length, filterJson },
            )
            const values = result.features.map(({ id: _, ...props }) => props)
            dispatch(actions.properties.set({ values }))
        } catch {
            dispatch(actions.properties.reset())
        }
    },
})

// On selectOne: notify table window (single feature)
listener.startListening({
    actionCreator: actions.selection.selectOne,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const layerId = action.payload.layerId
        const sourceId = state.layer.items[layerId]?.sourceId
        await notifyPropertiesWindow(sourceId, [action.payload.featureId])
    },
})

export default listener
```

- [x] **Step 2: Register in `listeners/index.ts`**

Add export:
```ts
export { default as selectionChanged } from "./selection-changed"
```

- [x] **Step 3: Register in `store/index.ts`**

Add to the middleware chain:
```ts
.prepend(listeners.selectionChanged.middleware)
```

- [x] **Step 4: Relax `showProperties` source type guard**

In `src/store/source/showProperties.ts`, update the guard:

```ts
// Before:
if (source.type !== SourceType.Geojson) {

// After:
if (source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) {
```

- [x] **Step 5: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [x] **Step 6: Commit**

```bash
git add src/store/listeners/selection-changed.ts src/store/listeners/index.ts src/store/index.ts src/store/source/showProperties.ts
git commit -m "Add selection-changed listener and relax showProperties guard"
```

---

### Task 12: Properties table window — All/Selected toggle

**Files:**
- Modify: `src/properties.tsx`

- [ ] **Step 1: Add All/Selected toggle and selection listener**

In `src/properties.tsx`, add a `SegmentedControl` from Mantine and the `properties-selection-changed` event listener.

Add to imports:
```ts
import { SegmentedControl } from "@mantine/core"
```

Add state in the `View` component:
```ts
const [attributeFilter, setAttributeFilter] = useState<"all" | "selected">("all")
const [selectionData, setSelectionData] = useState<{ sourceId: string; selectedIds: number[] } | null>(null)
```

Add a listener for `properties-selection-changed` (alongside the existing `properties-set` listener):
```ts
useEffect(() => {
    let stop: UnlistenFn | undefined
    listen<{ sourceId: string; selectedIds: number[] }>("properties-selection-changed", event => {
        setSelectionData(event.payload)
    }).then(fn => {
        stop = fn
    })
    return () => {
        stop?.()
    }
}, [])
```

Update the `filterExpression` derivation for the page-fetch effect:
```ts
// Derive effective filter expression
function makeIdFilter(ids: number[]): unknown[] {
    return ["in", ["id"], ["literal", ids]]
}

const effectiveFilter = (() => {
    if (attributeFilter === "selected" && selectionData && selectionData.sourceId === sourceId) {
        return makeIdFilter(selectionData.selectedIds) // empty ids → matches nothing
    }
    return filterExpression
})()
```

Use `effectiveFilter` (instead of `filterExpression`) when calling `reader.queryPage`.

Add the toggle to the JSX (above the table):
```tsx
<SegmentedControl
    size="xs"
    value={attributeFilter}
    onChange={v => {
        if (v === "all" || v === "selected") {
            setAttributeFilter(v)
        }
    }}
    data={[
        { label: "All", value: "all" },
        { label: "Selected", value: "selected" },
    ]}
/>
```

When "Selected" is active and `selectionData.selectedIds` is empty, the filter returns nothing — honest empty table.

- [ ] **Step 2: Format and confirm no TS errors**

```bash
npm run format && npm run build 2>&1 | grep -E "error TS|Error"
```

- [ ] **Step 3: Commit**

```bash
git add src/properties.tsx
git commit -m "Add All/Selected toggle to properties table window"
```

---

### Task 13: CLAUDE.md IPC table update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `source_query_rect` to the IPC Commands table**

The table entry (already partially added — verify and finalize):
```
| `source_query_rect` | Rect spatial query: `(id, bbox: [west,south,east,north], mode: "include"\|"intersect") -> Vec<i64>` |
```

- [ ] **Step 2: Run full test suite**

```bash
npm test 2>&1 | grep -E "PASS|FAIL|Tests"
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md IPC table with source_query_rect"
```
