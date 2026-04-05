# Bbox Selection Single-IPC Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse rect-select's two per-drag-frame IPC calls (`source_query_rect` + `selection_set/preview/add`) into a single composite call so the potentially-large hit list never crosses the IPC boundary.

**Architecture:** Add one new Tauri command `selection_rect(source_id, bbox, mode, op)` that locks `SourceStorage`, calls the existing `FeatureStore::query_rect`, releases that lock, locks `SelectionStorage`, calls the matching existing `SelectionState` method (`set` | `preview` | `add`), and returns `SelectionDelta`. The existing `source_query_rect` command stays in place (other callers may rely on it; user explicitly asked not to delete). The frontend rect-select listener switches from the two-call pattern to the single composite call for both drag (throttled) and commit paths.

**Tech Stack:** Rust (Tauri 2.9, Tokio), TypeScript (Redux Toolkit listener middleware), Vitest.

**Performance motivation:** On a 10k+ feature dataset, every 50 ms of drag currently sends a large `Vec<i64>` from Rust → frontend → back to Rust. Serializing 10k `i64`s across IPC twice per frame is the freeze culprit. The composite command keeps the full hit list Rust-side and ships only the small delta.

---

## File Structure

**Backend (Rust)**
- Modify `src-tauri/src/commands/selection.rs` — add `selection_rect` command (reads from both `SourceStorage` and `SelectionStorage`, same pattern as existing `selection_query_page`)
- Modify `src-tauri/src/main.rs` — register `selection_rect` in `invoke_handler`

**Frontend (TypeScript)**
- Modify `src/lib/selection-ipc.ts` — add `selectionRect` helper and `SelectionRectOp` type
- Modify `src/store/listeners/rect-select.ts` — replace two-call pattern with single `selectionRect` call in `rectSelectDrag` and `rectSelectCommit` handlers
- Create `src/store/listeners/rect-select.test.ts` — verify listener issues a single composite IPC call per drag/commit and dispatches expected actions

**Docs**
- Modify `CLAUDE.md` — add `selection_rect` to the IPC Commands table and update the `RectSelectOverlay` description

No crate files under `crates/*/` are touched, so no crate version bump is required.

---

## Task 1: Add `selection_rect` Tauri command

**Files:**
- Modify: `src-tauri/src/commands/selection.rs` (append at end, after `selection_query_page`)

- [x] **Step 1: Add the command to `selection.rs`**

Append to `src-tauri/src/commands/selection.rs`:

```rust
#[tauri::command]
pub async fn selection_rect(
    source_id: String,
    bbox: [f64; 4],
    mode: String,
    op: String,
    selection_storage: State<'_, SelectionStorage>,
    source_storage: State<'_, SourceStorage>,
) -> Result<SelectionDelta, String> {
    let fs = {
        let store = source_storage.store.lock().unwrap();
        let entry = store.get(&source_id).ok_or_else(|| format!("Not found {}", &source_id))?;
        entry
            .store
            .as_ref()
            .ok_or_else(|| "No feature store for this source".to_string())?
            .clone()
    };
    let ids = fs.query_rect(bbox, &mode);
    let mut state = selection_storage.state.lock().unwrap();
    let delta = match op.as_str() {
        "set" => state.set(&ids),
        "preview" => state.preview(&ids),
        "add" => state.add(&ids),
        other => return Err(format!("Unknown selection_rect op: {}", other)),
    };
    Ok(delta)
}
```

Note: `SourceStorage` is already imported at the top of the file (used by `selection_query_page`). No new imports needed.

- [x] **Step 2: Build to verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: clean build, no warnings from the new function.

- [x] **Step 3: Commit**

```bash
git add src-tauri/src/commands/selection.rs
git commit -m "Add selection_rect command combining spatial query and selection mutation"
```

---

## Task 2: Register `selection_rect` in `invoke_handler`

**Files:**
- Modify: `src-tauri/src/main.rs:36-62`

- [x] **Step 1: Add the handler entry**

In `src-tauri/src/main.rs`, inside `tauri::generate_handler![...]`, add `commands::selection::selection_rect,` immediately after `commands::selection::selection_query_page,` (line 61). The edit:

```rust
            commands::selection::selection_query_page,
            commands::selection::selection_rect,
        ])
```

- [x] **Step 2: Build to verify registration compiles**

Run: `cd src-tauri && cargo check`
Expected: clean build.

- [x] **Step 3: Commit**

```bash
git add src-tauri/src/main.rs
git commit -m "Register selection_rect in Tauri invoke handler"
```

---

## Task 3: Add `selectionRect` helper in `selection-ipc.ts`

**Files:**
- Modify: `src/lib/selection-ipc.ts`

- [x] **Step 1: Add the op type and helper**

Append to `src/lib/selection-ipc.ts` (after `selectionQueryPage`, before the file ends):

```ts
export type SelectionRectOp = "set" | "preview" | "add"

export function selectionRect(
    sourceId: string,
    bbox: [number, number, number, number],
    mode: "include" | "intersect",
    op: SelectionRectOp,
): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_rect", {
        sourceId,
        bbox,
        mode,
        op,
    })
}
```

- [x] **Step 2: Typecheck**

Run: `npm run build`
Expected: no TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add src/lib/selection-ipc.ts
git commit -m "Add selectionRect IPC helper"
```

---

## Task 4: Write failing test for rect-select listener single-IPC contract

**Files:**
- Create: `src/store/listeners/rect-select.test.ts`

The test covers both `rectSelectDrag` and `rectSelectCommit` handlers. It mocks:
- `@tauri-apps/api/core` `invoke` — records calls
- `@/map` `getMap` — returns a fake MapLibre map with `getContainer()` and `unproject()`
- `@/lib/selection-bus` `emitSelectionDelta` — no-op spy
- `../preview` `selectPreviewLayerIds` — no-op (only used by click path)

- [x] **Step 1: Write the test file**

Create `src/store/listeners/rect-select.test.ts`:

```ts
import { configureStore, type Middleware } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const invokeMock = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
    invoke: (...args: unknown[]) => invokeMock(...args),
}))

vi.mock("@/map", () => ({
    getMap: () => ({
        getContainer: () => ({
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        }),
        unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
    }),
}))

vi.mock("@/lib/selection-bus", () => ({
    emitSelectionDelta: vi.fn(),
}))

vi.mock("../preview", () => ({
    selectPreviewLayerIds: () => [],
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            selection: {
                sync: makeAction("selection/sync"),
                apply: makeAction("selection/apply"),
            },
        },
    }
})

import { rectSelectDrag, rectSelectCommit } from "../rect-select"
import listener from "./rect-select"

type Action = { type: string; payload?: unknown }

function makeStore(state: Record<string, unknown>) {
    const dispatched: Action[] = []
    const capture: Middleware = () => next => action => {
        dispatched.push(action as Action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware().prepend(listener.middleware).concat(capture),
    })
    return { store, dispatched }
}

describe("rect-select listener", () => {
    beforeEach(() => {
        invokeMock.mockReset()
        invokeMock.mockResolvedValue({ added: [1, 2], removed: [] })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    test("rectSelectDrag issues a single selection_rect IPC call with op=set (no modifier)", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        // allow async listener effect to run
        await Promise.resolve()
        await Promise.resolve()

        const rectCalls = invokeMock.mock.calls.filter(c => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({
            sourceId: "src-1",
            mode: "include",
            op: "set",
        })
        // legacy separate call must not be made
        expect(invokeMock.mock.calls.some(c => c[0] === "source_query_rect")).toBe(false)
        expect(invokeMock.mock.calls.some(c => c[0] === "selection_set")).toBe(false)
    })

    test("rectSelectDrag with shift modifier uses op=preview", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "shift",
            }),
        )

        await Promise.resolve()
        await Promise.resolve()

        const rectCalls = invokeMock.mock.calls.filter(c => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "preview" })
    })

    test("rectSelectDrag right-to-left produces mode=intersect", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 100, y: 10 },
                current: { x: 10, y: 100 },
                modifier: "none",
            }),
        )

        await Promise.resolve()
        await Promise.resolve()

        const rectCalls = invokeMock.mock.calls.filter(c => c[0] === "selection_rect")
        expect(rectCalls[0][1]).toMatchObject({ mode: "intersect" })
    })

    test("rectSelectDrag is a no-op when no source is selected", async () => {
        const { store } = makeStore({ source: { selectedId: null } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        await Promise.resolve()
        await Promise.resolve()

        expect(invokeMock).not.toHaveBeenCalled()
    })

    test("rectSelectCommit uses op=set (no modifier), then apply + count", async () => {
        invokeMock.mockImplementation((cmd: string) => {
            if (cmd === "selection_rect") return Promise.resolve({ added: [1], removed: [] })
            if (cmd === "selection_apply") return Promise.resolve({ added: [], removed: [] })
            if (cmd === "selection_count") return Promise.resolve(1)
            return Promise.resolve()
        })
        const { store, dispatched } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectCommit({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        // three awaits because commit awaits invoke three times (rect, apply, count)
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()

        const rectCalls = invokeMock.mock.calls.filter(c => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "set" })
        expect(invokeMock.mock.calls.some(c => c[0] === "selection_apply")).toBe(true)
        expect(invokeMock.mock.calls.some(c => c[0] === "selection_count")).toBe(true)
        expect(dispatched.some(a => a.type === "selection/sync")).toBe(true)
        expect(dispatched.some(a => a.type === "selection/apply")).toBe(true)
    })

    test("rectSelectCommit with shift modifier uses op=add", async () => {
        invokeMock.mockImplementation((cmd: string) => {
            if (cmd === "selection_rect") return Promise.resolve({ added: [1], removed: [] })
            if (cmd === "selection_apply") return Promise.resolve({ added: [], removed: [] })
            if (cmd === "selection_count") return Promise.resolve(1)
            return Promise.resolve()
        })
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectCommit({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "shift",
            }),
        )

        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()

        const rectCalls = invokeMock.mock.calls.filter(c => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "add" })
    })
})
```

- [x] **Step 2: Run the test — it must fail**

Run: `npm test -- src/store/listeners/rect-select.test.ts`
Expected: **FAIL**. The listener still calls `source_query_rect` and `selection_set`/`selection_preview`/`selection_add` separately, so `selection_rect` is never invoked. Tests asserting `rectCalls` length 1 fail.

- [x] **Step 3: Commit the failing test**

```bash
git add src/store/listeners/rect-select.test.ts
git commit -m "Add failing test for rect-select single-IPC contract"
```

---

## Task 5: Refactor rect-select listener to use single composite IPC call

**Files:**
- Modify: `src/store/listeners/rect-select.ts:1-116`

- [x] **Step 1: Update imports in `rect-select.ts`**

Replace the import block at the top of `src/store/listeners/rect-select.ts` (lines 1-21). Remove the unused `invoke` import and the selection helpers that only the rect branches used (`selectionSet`, `selectionPreview`, `selectionAdd`), but keep `selectionAdd`, `selectionRemove`, `selectionSet`, `selectionClear` for the click path, and add `selectionRect`:

```ts
import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { queryFeaturesInPoint } from "@/lib/maplibre"
import { emitSelectionDelta } from "@/lib/selection-bus"
import {
    type SelectionDelta,
    selectionAdd,
    selectionApply,
    selectionClear,
    selectionCount,
    selectionRect,
    selectionRemove,
    selectionSet,
} from "@/lib/selection-ipc"
import maplibregl from "maplibre-gl"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectPreviewLayerIds } from "../preview"
import { rectSelectDrag, rectSelectCommit, rectSelectClick } from "../rect-select"
```

(Note: `invoke` is no longer needed since both drag and commit now call `selectionRect`, and the click path uses the existing `selection*` helpers. `selectionPreview` is no longer referenced.)

- [x] **Step 2: Rewrite the `rectSelectDrag` handler (replaces lines 47-80)**

Replace the entire `listener.startListening({ actionCreator: rectSelectDrag, ... })` block with:

```ts
listener.startListening({
    actionCreator: rectSelectDrag,
    effect: async (action, listenerApi) => {
        const now = Date.now()
        if (now - lastThrottle < THROTTLE_MS) {
            return
        }
        lastThrottle = now

        const generation = ++queryGeneration
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)
        const op = modifier === "shift" ? "preview" : "set"

        const delta = await selectionRect(sourceId, bbox, mode, op)

        if (generation !== queryGeneration) return

        emitSelectionDelta(delta)
    },
})
```

- [x] **Step 3: Rewrite the `rectSelectCommit` handler (replaces lines 82-116)**

Replace the `rectSelectCommit` block with:

```ts
listener.startListening({
    actionCreator: rectSelectCommit,
    effect: async (action, listenerApi) => {
        const generation = ++queryGeneration
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)
        const op = modifier === "shift" ? "add" : "set"

        const delta = await selectionRect(sourceId, bbox, mode, op)

        if (generation !== queryGeneration) return

        emitSelectionDelta(delta)

        const applyDelta = await selectionApply()
        emitSelectionDelta(applyDelta)

        const count = await selectionCount()
        listenerApi.dispatch(actions.selection.sync({ count, sourceId }))
        listenerApi.dispatch(actions.selection.apply())
    },
})
```

Leave the `rectSelectClick` handler (lines 118-165) and the unused `SelectionDelta` type import unchanged — the click path still uses `selectionSet`/`selectionAdd`/`selectionRemove`/`selectionClear`.

- [x] **Step 4: Run the new test — it must pass**

Run: `npm test -- src/store/listeners/rect-select.test.ts`
Expected: **PASS** (all six tests green). Each drag dispatches exactly one `selection_rect` invoke; `source_query_rect` and `selection_set`/`selection_preview`/`selection_add` are no longer called from the rect branches.

- [x] **Step 5: Run the full frontend test suite to check for regressions**

Run: `npm test`
Expected: all tests pass.

- [x] **Step 6: Run the formatter**

Run: `npm run format`
Expected: no unexpected diffs (or only whitespace).

- [x] **Step 7: Run the linter**

Run: `npm run lint`
Expected: no errors.

- [x] **Step 8: Commit**

```bash
git add src/store/listeners/rect-select.ts src/store/listeners/rect-select.test.ts
git commit -m "Use single selection_rect IPC call in rect-select listener"
```

---

## Task 6: Update CLAUDE.md with the new IPC command

**Files:**
- Modify: `CLAUDE.md:86` (RectSelectOverlay description) and the IPC Commands table around line 174

- [x] **Step 1: Update the `RectSelectOverlay` bullet**

In `CLAUDE.md`, find the `RectSelectOverlay` bullet under `components/SphereMap/` (line 86). Replace the phrase "Calls `source_query_rect` and dispatches `selectMany`" with "Calls `selection_rect` (single IPC call that spatially queries and mutates selection server-side, returning a delta) and emits the delta on the selection bus".

The updated bullet:

```markdown
  - `RectSelectOverlay` - Transparent overlay that captures mouse drag when `mapTool === "select"`. Drag left-to-right = `"include"` mode (solid border); right-to-left = `"intersect"` mode (dashed border). Calls `selection_rect` (single IPC call that spatially queries and mutates selection server-side, returning a delta) and emits the delta on the selection bus. Requires `selectors.selection.currentSourceId` to be set (set by `selectMany`; absent when `selectOne` used)
```

- [x] **Step 2: Add `selection_rect` to the IPC Commands table**

In `CLAUDE.md`, in the IPC Commands table, add a new row immediately after `selection_get_ids` and before `show_in_finder`. Column widths are aligned with the longest entry in the table:

```markdown
| `selection_rect`          | Spatially query a source by bbox and apply to selection state in one call: `(source_id, bbox: [west,south,east,north], mode: "include"\|"intersect", op: "set"\|"preview"\|"add") -> SelectionDelta` |
```

- [x] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Document selection_rect IPC command"
```

---

## Verification

- [x] **Full test suite**: `npm test` (all green)
- [x] **Lint**: `npm run lint` (clean)
- [x] **Rust build**: `cd src-tauri && cargo check` (clean)
- [ ] **Manual smoke test**: `npm run tauri dev`, load a dataset with 10k+ features, enter the Sources tab, switch to the select tool, drag a rectangle across the map. Expect: smooth highlighting during drag, no freeze, selection count matches visually.

---

## Out of Scope

- Deleting `source_query_rect` — user explicitly asked to keep existing commands.
- Changing the click path in `rectSelectClick` — it uses MapLibre's client-side `queryFeaturesInPoint`, not a spatial query, so no IPC round-trip to optimize.
- Rendering pipeline changes — feature highlighting still flows through the existing selection-bus / `useFeatureState` mechanism.
