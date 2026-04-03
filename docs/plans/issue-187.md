# Draw Only Selected — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When entering draw mode with features selected, load only those features into MapLibre Draw; always save via `source_patch` with event-based change tracking.

**Architecture:** Two new Rust IPC commands (`source_get_slice`, `selection_get_ids`). Draw slice extended with `selectedIds`. Draw component tracks MapLibre Draw events (create/update/delete) and builds a patch on "Done". The save-draw listener forwards the patch to `source_patch` instead of `source_replace`.

**Tech Stack:** Rust/Tauri backend, React/TypeScript/Redux Toolkit frontend, MapLibre GL Draw

**Spec:** `docs/specs/issue-187.md`

---

### Task 1: Rust — `selection_get_ids` command

**Files:**
- Modify: `src-tauri/src/commands/selection.rs`
- Modify: `src-tauri/src/main.rs`

- [x] **Step 1: Add the command**

In `src-tauri/src/commands/selection.rs`, add after the `selection_count` function:

```rust
#[tauri::command]
pub async fn selection_get_ids(
    storage: State<'_, SelectionStorage>,
) -> Result<Vec<i64>, String> {
    let state = storage.state.lock().unwrap();
    Ok(state.get_ids())
}
```

- [x] **Step 2: Register the command**

In `src-tauri/src/main.rs`, add `commands::selection::selection_get_ids` to the `invoke_handler` array, after `selection_query_page`.

- [x] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: no errors

- [x] **Step 4: Commit**

```bash
git add src-tauri/src/commands/selection.rs src-tauri/src/main.rs
git commit -m "add selection_get_ids IPC command"
```

---

### Task 2: Rust — `slice_feature_collection` in libsphere

**Files:**
- Modify: `crates/libsphere/src/source.rs`

- [x] **Step 1: Write failing tests**

Add at the bottom of `crates/libsphere/src/source.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use geojson::{Feature, FeatureCollection, feature::Id};

    fn make_feature(id: i64) -> Feature {
        Feature {
            id: Some(Id::Number(id.into())),
            geometry: Some(geojson::Geometry::new(geojson::Value::Point(vec![0.0, 0.0]))),
            properties: None,
            bbox: None,
            foreign_members: None,
        }
    }

    fn make_fc(ids: &[i64]) -> FeatureCollection {
        FeatureCollection {
            features: ids.iter().map(|&id| make_feature(id)).collect(),
            bbox: None,
            foreign_members: None,
        }
    }

    #[test]
    fn slice_returns_matching_features() {
        let fc = make_fc(&[1, 2, 3, 4, 5]);
        let result = slice_feature_collection(fc, &[2, 4]);
        assert_eq!(result.features.len(), 2);
        assert_eq!(result.features[0].id, Some(Id::Number(2.into())));
        assert_eq!(result.features[1].id, Some(Id::Number(4.into())));
    }

    #[test]
    fn slice_returns_empty_when_no_match() {
        let fc = make_fc(&[1, 2, 3]);
        let result = slice_feature_collection(fc, &[10, 20]);
        assert_eq!(result.features.len(), 0);
    }

    #[test]
    fn slice_with_empty_ids_returns_empty() {
        let fc = make_fc(&[1, 2, 3]);
        let result = slice_feature_collection(fc, &[]);
        assert_eq!(result.features.len(), 0);
    }

    #[test]
    fn slice_skips_features_without_id() {
        let mut fc = make_fc(&[1, 2]);
        fc.features.push(Feature {
            id: None,
            geometry: None,
            properties: None,
            bbox: None,
            foreign_members: None,
        });
        let result = slice_feature_collection(fc, &[1, 2]);
        assert_eq!(result.features.len(), 2);
    }

    #[test]
    fn slice_preserves_feature_order() {
        let fc = make_fc(&[5, 3, 1, 4, 2]);
        let result = slice_feature_collection(fc, &[4, 1]);
        assert_eq!(result.features.len(), 2);
        assert_eq!(result.features[0].id, Some(Id::Number(1.into())));
        assert_eq!(result.features[1].id, Some(Id::Number(4.into())));
    }
}
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd src-tauri && cargo test -p libsphere -- source::tests`
Expected: FAIL — `slice_feature_collection` not found

- [x] **Step 3: Implement the function**

Add in `crates/libsphere/src/source.rs`, before the `#[cfg(test)]` block:

```rust
pub fn slice_feature_collection(
    fc: geojson::FeatureCollection,
    ids: &[i64],
) -> geojson::FeatureCollection {
    let filtered: Vec<geojson::Feature> = fc.features.into_iter().filter(|f| {
        f.id.as_ref().map_or(false, |fid| match fid {
            geojson::feature::Id::Number(n) => n.as_i64().map_or(false, |n| ids.contains(&n)),
            _ => false,
        })
    }).collect();
    geojson::FeatureCollection {
        bbox: None,
        features: filtered,
        foreign_members: None,
    }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd src-tauri && cargo test -p libsphere -- source::tests`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add crates/libsphere/src/source.rs
git commit -m "add slice_feature_collection to libsphere"
```

---

### Task 3: Rust — `source_get_slice` IPC command

**Files:**
- Modify: `src-tauri/src/commands/source.rs`
- Modify: `src-tauri/src/main.rs`

- [x] **Step 1: Add the command**

In `src-tauri/src/commands/source.rs`, add after the `source_get` function:

```rust
#[tauri::command]
pub async fn source_get_slice(
    id: String,
    ids: Vec<i64>,
    storage: State<'_, SourceStorage>,
) -> Result<String, String> {
    let store = storage.store.lock().unwrap();
    let entry = store.get(&id).ok_or_else(|| format!("Not found {}", &id))?;
    let fc = entry.source.to_feature_collection()?;
    let result = libsphere::source::slice_feature_collection(fc, &ids);
    serde_json::to_string(&result).map_err(|e| e.to_string())
}
```

- [x] **Step 2: Register the command**

In `src-tauri/src/main.rs`, add `commands::source::source_get_slice` to the `invoke_handler` array, after `source_get`.

- [x] **Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: no errors

- [x] **Step 4: Commit**

```bash
git add src-tauri/src/commands/source.rs src-tauri/src/main.rs
git commit -m "add source_get_slice IPC command"
```

---

### Task 4: Frontend — `selectionGetIds` IPC wrapper

**Files:**
- Modify: `src/lib/selection-ipc.ts`

- [x] **Step 1: Add the function**

In `src/lib/selection-ipc.ts`, add after the `selectionCount` function:

```ts
export function selectionGetIds(): Promise<number[]> {
    return invoke<number[]>("selection_get_ids")
}
```

- [x] **Step 2: Commit**

```bash
git add src/lib/selection-ipc.ts
git commit -m "add selectionGetIds IPC wrapper"
```

---

### Task 5: Draw slice — add `selectedIds`

**Files:**
- Modify: `src/store/draw.ts`
- Modify: `src/store/draw.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/store/draw.test.ts`:

```ts
test("initial state has empty selectedIds", () => {
    const state = reducer(undefined, { type: "@@INIT" })
    expect(state.selectedIds).toEqual([])
})

test("start sets selectedIds", () => {
    const state = reducer(undefined, start({ sourceId: "s1", selectedIds: [1, 2, 3] }))
    expect(state.selectedIds).toEqual([1, 2, 3])
})

test("start with empty selectedIds", () => {
    const state = reducer(undefined, start({ sourceId: "s1", selectedIds: [] }))
    expect(state.selectedIds).toEqual([])
})

test("done clears selectedIds", () => {
    const prev = { sourceId: "s1", selectedIds: [1, 2] }
    const state = reducer(prev, done({ sourceId: "s1" }))
    expect(state.selectedIds).toEqual([])
})

test("reset clears selectedIds", () => {
    const prev = { sourceId: "s1", selectedIds: [1, 2] }
    const state = reducer(prev, reset())
    expect(state.selectedIds).toEqual([])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/store/draw.test.ts`
Expected: FAIL — `selectedIds` property missing, `start` action doesn't accept `selectedIds`

- [ ] **Step 3: Update the draw slice**

In `src/store/draw.ts`, change the state type:

```ts
type DrawState = {
    sourceId?: Id
    selectedIds: number[]
}
```

Update `initialState`:

```ts
const initialState: DrawState = {
    selectedIds: [],
}
```

Update the `start` reducer:

```ts
start: (state, action: PayloadAction<{ sourceId: Id; selectedIds: number[] }>) => {
    state.sourceId = action.payload.sourceId
    state.selectedIds = action.payload.selectedIds
},
```

Update the `commit` action type:

```ts
commit: (
    state,
    _: PayloadAction<{
        sourceId: Id
        patch: {
            added: GeoJSON.Feature[]
            updated: GeoJSON.Feature[]
            deleted_ids: (string | number)[]
        }
    }>,
) => {
    return state
},
```

Update `done`:

```ts
done: (state, _: PayloadAction<{ sourceId: Id }>) => {
    state.sourceId = undefined
    state.selectedIds = []
},
```

Update `reset`:

```ts
reset: state => {
    state.sourceId = undefined
    state.selectedIds = []
},
```

- [ ] **Step 4: Fix the existing test for `start`**

The existing test `"start sets sourceId"` now needs `selectedIds`. Update it:

```ts
test("start sets sourceId", () => {
    const state = reducer(undefined, start({ sourceId: "my-source", selectedIds: [] }))
    expect(state.sourceId).toBe("my-source")
})
```

And `"start with another id sets sourceId"`:

```ts
test("start with another id sets sourceId", () => {
    const state = reducer(undefined, start({ sourceId: "source-42", selectedIds: [] }))
    expect(state.sourceId).toBe("source-42")
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/store/draw.test.ts`
Expected: PASS

- [ ] **Step 6: Run format**

Run: `npm run format`

- [ ] **Step 7: Commit**

```bash
git add src/store/draw.ts src/store/draw.test.ts
git commit -m "extend draw slice with selectedIds and patch-based commit"
```

---

### Task 6: Draw component — original ID preservation and event tracking

**Files:**
- Modify: `src/components/SphereMap/Draw.tsx`

- [ ] **Step 1: Update Draw component**

Replace the full content of `src/components/SphereMap/Draw.tsx`:

```tsx
import { useDrawControl } from "@/hooks/useDrawControl"
import logger from "@/logger"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { Overlay } from "@/ui/Overlay"
import { Button, Flex } from "@mantine/core"
import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useMap } from "react-map-gl/maplibre"

export type DrawProps = {
    mapId: string
}

type ChangeTracker = {
    created: Set<string>
    updated: Set<string>
    deleted: Map<string, string | number | undefined>
}

export default function Draw({ mapId }: DrawProps) {
    const dispatch = useAppDispatch()
    const sourceId = useAppSelector(state => state.draw.sourceId)
    const selectedIds = useAppSelector(state => state.draw.selectedIds)

    const origIdKey = useMemo(
        () => `__sphere_draw_${crypto.randomUUID().replace(/-/g, "")}_origid`,
        [],
    )

    const tracker = useRef<ChangeTracker>({
        created: new Set(),
        updated: new Set(),
        deleted: new Map(),
    })

    const onChange = useCallback(
        (event: { features: GeoJSON.Feature[]; type: string }) => {
            const t = tracker.current
            for (const feature of event.features) {
                const drawId = String(feature.id)
                switch (event.type) {
                    case "draw.create": {
                        t.created.add(drawId)
                        break
                    }
                    case "draw.update": {
                        if (!t.created.has(drawId)) {
                            t.updated.add(drawId)
                        }
                        break
                    }
                    case "draw.delete": {
                        if (t.created.has(drawId)) {
                            t.created.delete(drawId)
                        } else {
                            const origId = feature.properties?.[origIdKey]
                            t.deleted.set(drawId, origId)
                            t.updated.delete(drawId)
                        }
                        break
                    }
                }
            }
        },
        [origIdKey],
    )

    const { [mapId]: ref } = useMap()
    const draw = useDrawControl({
        ref,
        onChange,
        position: "top-left",
        controls: {
            point: true,
            polygon: true,
            line_string: true,
            combine_features: true,
            uncombine_features: true,
            trash: true,
        },
        displayControlsDefault: false,
    })

    useEffect(() => {
        if (!sourceId) return
        const fetchData =
            selectedIds.length > 0
                ? invoke<string>("source_get_slice", { id: sourceId, ids: selectedIds })
                : invoke<string>("source_get", { id: sourceId })
        fetchData
            .then(json => {
                const fc: GeoJSON.FeatureCollection = JSON.parse(json)
                for (const feature of fc.features) {
                    if (feature.id !== undefined && feature.id !== null) {
                        if (!feature.properties) {
                            feature.properties = {}
                        }
                        feature.properties[origIdKey] = feature.id
                    }
                }
                draw.set(fc)
            })
            .catch(err => {
                logger.error("Failed to load draw source %s: %s", sourceId, err)
            })
    }, [sourceId, selectedIds, draw, origIdKey])

    const onCancel = useCallback(() => {
        dispatch(actions.tools.reset())
    }, [dispatch])

    const onDone = useCallback(() => {
        if (!sourceId) return
        const t = tracker.current
        const all = draw.getAll()

        const added: GeoJSON.Feature[] = []
        const updated: GeoJSON.Feature[] = []
        for (const feature of all.features) {
            const drawId = String(feature.id)
            const origId = feature.properties?.[origIdKey]
            if (feature.properties) {
                delete feature.properties[origIdKey]
            }
            if (t.created.has(drawId)) {
                delete feature.id
                added.push(feature)
            } else if (t.updated.has(drawId)) {
                if (origId !== undefined) {
                    feature.id = origId
                }
                updated.push(feature)
            }
        }

        const deleted_ids: (string | number)[] = []
        for (const [, origId] of t.deleted) {
            if (origId !== undefined) {
                deleted_ids.push(origId)
            }
        }

        dispatch(
            actions.draw.commit({
                sourceId,
                patch: { added, updated, deleted_ids },
            }),
        )
    }, [dispatch, sourceId, draw, origIdKey])

    return (
        <Overlay
            bottom={
                <Flex gap="xs">
                    <Button size="xs" color="gray" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="xs" onClick={onDone}>
                        Done
                    </Button>
                </Flex>
            }
        />
    )
}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run format**

Run: `npm run format`

- [ ] **Step 4: Commit**

```bash
git add src/components/SphereMap/Draw.tsx
git commit -m "draw component: load filtered features, track changes, build patch"
```

---

### Task 7: save-draw listener — switch to `source_patch`

**Files:**
- Modify: `src/store/listeners/save-draw.ts`
- Modify: `src/store/listeners/save-draw.test.ts`

- [ ] **Step 1: Update test expectations**

Replace the content of `src/store/listeners/save-draw.test.ts`:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({
    mockInvoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@tauri-apps/api/core", () => ({
    invoke: mockInvoke,
}))

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            draw: {
                commit: makeAction("draw/commit"),
                done: (payload: unknown) => ({ type: "draw/done", payload }),
            },
            source: {
                bumpVersion: (payload: unknown) => ({ type: "source/bumpVersion", payload }),
            },
            tools: {
                reset: () => ({ type: "tools/reset" }),
            },
        },
    }
})

import listener from "./save-draw"

type DispatchedAction = { type: string; payload?: unknown }

function makeStore() {
    const dispatchedActions: DispatchedAction[] = []
    const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatchedActions.push(action as DispatchedAction)
        return next(action)
    }
    const store = configureStore({
        reducer: (s: Record<string, unknown> = {}) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                // biome-ignore lint/suspicious/noExplicitAny: Redux Toolkit middleware type system requires escape hatch
                .concat(captureMiddleware as any),
    })
    return { store, dispatchedActions }
}

const patch = {
    added: [
        {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [10, 20] },
            properties: { name: "new" },
        },
    ],
    updated: [
        {
            type: "Feature" as const,
            id: 1,
            geometry: { type: "Point" as const, coordinates: [30, 40] },
            properties: { name: "changed" },
        },
    ],
    deleted_ids: [2, 3],
}

describe("save-draw listener", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        mockInvoke.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("calls source_patch and dispatches bumpVersion, done, and reset on success", async () => {
        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_patch", { id: sourceId, patch })

        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })

    test("does not dispatch done or reset when source_patch fails", async () => {
        mockInvoke.mockRejectedValue(new Error("IPC error"))

        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeUndefined()
    })

    test("passes correct sourceId to bumpVersion and done", async () => {
        const sourceId = "my-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        const bumpAction = dispatchedActions.find(a => a.type === "source/bumpVersion")
        expect(bumpAction?.payload).toBe(sourceId)

        const doneAction = dispatchedActions.find(a => a.type === "draw/done")
        expect((doneAction?.payload as { sourceId: string }).sourceId).toBe(sourceId)
    })

    test("skips IPC when patch is empty", async () => {
        const sourceId = "draw-source"
        const emptyPatch = { added: [], updated: [], deleted_ids: [] }
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch: emptyPatch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/store/listeners/save-draw.test.ts`
Expected: FAIL — listener still calls `source_replace`

- [ ] **Step 3: Update the listener**

Replace the content of `src/store/listeners/save-draw.ts`:

```ts
import logger from "@/logger"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.draw.commit,
    effect: async (action, listenerApi) => {
        const { sourceId, patch } = action.payload
        const hasChanges =
            patch.added.length > 0 || patch.updated.length > 0 || patch.deleted_ids.length > 0
        if (hasChanges) {
            try {
                await invoke("source_patch", { id: sourceId, patch })
            } catch (err) {
                logger.error("Failed to save draw source %s: %s", sourceId, err)
                return
            }
            listenerApi.dispatch(actions.source.bumpVersion(sourceId))
        }
        listenerApi.dispatch(actions.draw.done({ sourceId }))
        listenerApi.dispatch(actions.tools.reset())
    },
})

export default listener
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/store/listeners/save-draw.test.ts`
Expected: PASS

- [ ] **Step 5: Run format**

Run: `npm run format`

- [ ] **Step 6: Commit**

```bash
git add src/store/listeners/save-draw.ts src/store/listeners/save-draw.test.ts
git commit -m "save-draw listener: switch from source_replace to source_patch"
```

---

### Task 8: SourcePanel — pass `selectedIds` when entering draw mode

**Files:**
- Modify: `src/components/SourcePanel/index.tsx`

- [ ] **Step 1: Update the edit case**

In `src/components/SourcePanel/index.tsx`, add the import at the top:

```ts
import { selectionGetIds } from "@/lib/selection-ipc"
```

Replace the `"edit"` case (lines 98–111) with:

```ts
case "edit": {
    if (!source.editable) break
    if (drawing) {
        dispatch(actions.tools.reset())
    } else {
        const selectionCount = store.getState().selection.count
        const selectedIds =
            selectionCount > 0 ? await selectionGetIds() : []
        dispatch(
            actions.draw.start({
                sourceId: source.id,
                selectedIds,
            }),
        )
        dispatch(actions.tools.setTool("draw"))
    }
    break
}
```

Note: the `onAction` callback needs to be `async`. Check whether it already is. If not, make it async.

- [ ] **Step 2: Ensure `store` is accessible**

The component needs access to `store.getState()` for the selection count. Check if it uses `useStore()` already. If not, add:

```ts
import { useStore } from "react-redux"
```

And inside the component:

```ts
const store = useStore()
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Run format**

Run: `npm run format`

- [ ] **Step 5: Commit**

```bash
git add src/components/SourcePanel/index.tsx
git commit -m "pass selected feature IDs when entering draw mode"
```

---

### Task 9: Integration — full test run and verify

- [ ] **Step 1: Run all frontend tests**

Run: `npm test -- --run`
Expected: all tests pass

- [ ] **Step 2: Run Rust tests**

Run: `cd src-tauri && cargo test -p libsphere -- source::tests`
Expected: all pass

- [ ] **Step 3: Run Rust check**

Run: `cd src-tauri && cargo check`
Expected: no errors

- [ ] **Step 4: Run frontend build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors
