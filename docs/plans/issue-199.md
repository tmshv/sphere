# Info Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app.mapTool: "pan" | "select"` + `app.showFeatureProperties` with a unified three-tool picker (Navigation / Select / Info). Centralize tool capabilities in set-based selectors. Add a `selected=N` status-bar badge.

**Architecture:** Single `mapTool` enum drives map interaction. Three capability sets (selection, hover popup, popup visibility) exported as selectors so components never compare raw tool values. Navigation disables click-select and overlay. Select+Info both activate the rect-select overlay (which absorbs clicks and drags). Info additionally activates hover-popup lookup and popup visibility. Popup content = hover entries if any, else selection entries (derived by a single selector).

**Tech Stack:** React 18, Redux Toolkit (listener middleware + createSelector), react-map-gl/MapLibre, Mantine, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-06-three-tool-map-interaction-design.md`

---

## File Map

**New:**
- `src/lib/map-tools.ts` — `MapTool` type, capability sets, set-based selector helpers
- `src/lib/map-tools.test.ts`

**Modified:**
- `src/store/app.ts` — `mapTool` enum values, remove `showFeatureProperties`
- `src/store/app.test.ts`
- `src/store/keyboard.ts` — Escape → navigation
- `src/store/listeners/map-tool-changed.ts` — handle new enum; drop Sources-tab reset; update draw-reset target
- `src/store/listeners/map-tool-changed.test.ts`
- `src/store/properties/index.ts` — add `hoverEntries` field + actions
- `src/store/properties/index.test.ts`
- `src/store/selectors.ts` — add `selectPopupEntries`
- `src/store/selectors.test.ts`
- `src/components/SphereMap/RectSelectOverlay.tsx` — activate on Select+Info
- `src/components/SphereMap/MapToolbar.tsx` — 3 buttons, global visibility
- `src/components/MapStatusbar/index.tsx` — rewire `IconInfoCircle`; drop Sources-tab guard; add `selected=N` badge
- `src/components/PropertiesPopup/index.tsx` — gate on `selectPopupVisible`; render `selectPopupEntries`
- `src/hooks/useFeatureProperties.ts` — purely hover; write to `hoverEntries`
- `src/hooks/useFeatureProperties.test.ts`
- `src/sphere-hooks/useFeatureProperties.ts` — gate on `selectHoverPopupEnabled`
- `src/components/SphereMap/map-body.tsx` — remove `useFeatureSelect` import/call

**Deleted:**
- `src/sphere-hooks/useFeatureSelect.ts`
- `src/sphere-hooks/useFeatureSelect.test.tsx`

---

## Task 1: Introduce `MapTool` type and capability sets

**Files:**
- Create: `src/lib/map-tools.ts`
- Test: `src/lib/map-tools.test.ts`

- [x] **Step 1: Write failing test**

```ts
// src/lib/map-tools.test.ts
import { describe, expect, test } from "vitest"
import {
    type MapTool,
    DEFAULT_MAP_TOOL,
    isClickSelectEnabled,
    isRectSelectEnabled,
    isHoverPopupEnabled,
    isPopupVisible,
} from "./map-tools"

describe("map-tools capability sets", () => {
    test("DEFAULT_MAP_TOOL is navigation", () => {
        expect(DEFAULT_MAP_TOOL).toBe("navigation")
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", true],
        ["info", true],
    ])("isClickSelectEnabled(%s) = %s", (tool, expected) => {
        expect(isClickSelectEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", true],
        ["info", true],
    ])("isRectSelectEnabled(%s) = %s", (tool, expected) => {
        expect(isRectSelectEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", false],
        ["info", true],
    ])("isHoverPopupEnabled(%s) = %s", (tool, expected) => {
        expect(isHoverPopupEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", false],
        ["info", true],
    ])("isPopupVisible(%s) = %s", (tool, expected) => {
        expect(isPopupVisible(tool)).toBe(expected)
    })
})
```

- [x] **Step 2: Run test to verify fail**

Run: `npx vitest run src/lib/map-tools.test.ts`
Expected: FAIL (module not found).

- [x] **Step 3: Create `src/lib/map-tools.ts`**

```ts
export type MapTool = "navigation" | "select" | "info"

export const DEFAULT_MAP_TOOL: MapTool = "navigation"

const SELECTION_TOOLS = new Set<MapTool>(["select", "info"])
const HOVER_POPUP_TOOLS = new Set<MapTool>(["info"])
const POPUP_VISIBLE_TOOLS = new Set<MapTool>(["info"])

export function isClickSelectEnabled(tool: MapTool): boolean {
    return SELECTION_TOOLS.has(tool)
}

export function isRectSelectEnabled(tool: MapTool): boolean {
    return SELECTION_TOOLS.has(tool)
}

export function isHoverPopupEnabled(tool: MapTool): boolean {
    return HOVER_POPUP_TOOLS.has(tool)
}

export function isPopupVisible(tool: MapTool): boolean {
    return POPUP_VISIBLE_TOOLS.has(tool)
}
```

- [x] **Step 4: Run test to verify pass**

Run: `npx vitest run src/lib/map-tools.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/map-tools.ts src/lib/map-tools.test.ts
git commit -m "Add MapTool type and capability helpers"
```

---

## Task 2: Migrate `app.mapTool` to new enum and drop `showFeatureProperties`

**Files:**
- Modify: `src/store/app.ts`
- Modify: `src/store/app.test.ts`

- [x] **Step 1: Update `src/store/app.test.ts`** (rewrite `mapTool` block, drop `showFeatureProperties`)

Replace the existing `describe("app slice mapTool")` block with:

```ts
describe("app slice mapTool", () => {
    test("default mapTool is navigation", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.mapTool).toBe("navigation")
    })

    test("setMapTool changes to select", () => {
        const state = reducer(undefined, setMapTool("select"))
        expect(state.mapTool).toBe("select")
    })

    test("setMapTool changes to info", () => {
        const state = reducer(undefined, setMapTool("info"))
        expect(state.mapTool).toBe("info")
    })

    test("setMapTool returns to navigation", () => {
        const prev = { ...reducer(undefined, { type: "@@INIT" }), mapTool: "select" as const }
        const state = reducer(prev, setMapTool("navigation"))
        expect(state.mapTool).toBe("navigation")
    })
})
```

If any other test references `showFeatureProperties` or `toggleFeatureProperties`, delete those test cases.

- [x] **Step 2: Run tests to confirm fail**

Run: `npx vitest run src/store/app.test.ts`
Expected: FAIL (mapTool initial value mismatch; missing actions/selectors).

- [x] **Step 3: Update `src/store/app.ts`**

Replace the existing `AppState`, `initialState`, reducers block, and selectors with:

```ts
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { DEFAULT_MAP_TOOL, type MapTool } from "@/lib/map-tools"
import type { RootState } from "."

type AppState = {
    version: string
    zenMode: boolean
    darkTheme: boolean
    showAttribution: boolean
    showLeftSidebar: boolean
    showRightSidebar: boolean
    activeSidebarTab: "sources" | "layers"
    mapTool: MapTool
}

const initialState: AppState = {
    version: "",
    zenMode: false,
    darkTheme: false,
    showAttribution: false,
    showLeftSidebar: true,
    showRightSidebar: true,
    activeSidebarTab: "sources",
    mapTool: DEFAULT_MAP_TOOL,
}

export const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        setVersion: (state, action: PayloadAction<string>) => {
            state.version = action.payload
        },
        toggleZenMode: state => {
            state.zenMode = !state.zenMode
        },
        toggleDarkTheme: state => {
            state.darkTheme = !state.darkTheme
        },
        setDarkTheme: (state, action: PayloadAction<boolean>) => {
            state.darkTheme = action.payload
        },
        showLeftSidebar: state => {
            state.showLeftSidebar = true
        },
        hideLeftSidebar: state => {
            state.showLeftSidebar = false
        },
        showRightSidebar: state => {
            state.showRightSidebar = true
        },
        hideRightSidebar: state => {
            state.showRightSidebar = false
        },
        setActiveSidebarTab: (state, action: PayloadAction<"sources" | "layers">) => {
            state.activeSidebarTab = action.payload
        },
        setMapTool: (state, action: PayloadAction<MapTool>) => {
            state.mapTool = action.payload
        },
    },
    selectors: {
        isZen: state => state.zenMode,
        isDark: state => state.darkTheme,
    },
})

export const actions = {
    ...appSlice.actions,
}

export const selectActiveSidebarTab = (state: RootState) => state.app.activeSidebarTab
export const selectMapTool = (state: RootState) => state.app.mapTool
export const selectShowAttribution = (state: RootState) => state.app.showAttribution
export const selectShowLeftSidebar = (state: RootState) => state.app.showLeftSidebar && !state.app.zenMode
export const selectShowRightSidebar = (state: RootState) => state.app.showRightSidebar
export const selectVersion = (state: RootState) => state.app.version

export default appSlice.reducer
```

- [x] **Step 4: Run app tests**

Run: `npx vitest run src/store/app.test.ts`
Expected: PASS.

- [x] **Step 5: Run TypeScript compile to surface every consumer of removed symbols**

Run: `npx tsc --noEmit`
Expected: FAIL with errors for each remaining reference to `"pan"`, `showFeatureProperties`, `toggleFeatureProperties`, `selectShowFeatureProperties`. Do not fix them here — later tasks address each site.

- [x] **Step 6: Commit**

```bash
git add src/store/app.ts src/store/app.test.ts
git commit -m "Migrate app.mapTool to navigation|select|info and drop showFeatureProperties"
```

---

## Task 3: Update Escape handler to reset to navigation

**Files:**
- Modify: `src/store/keyboard.ts`

- [x] **Step 1: Update `src/store/keyboard.ts`**

Replace contents with:

```ts
import { DEFAULT_MAP_TOOL } from "@/lib/map-tools"
import type { store } from "."
import { actions } from "./actions"

export function setupKeyboard(s: typeof store) {
    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            const { mapTool } = s.getState().app
            if (mapTool !== DEFAULT_MAP_TOOL) {
                s.dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
    })
}
```

- [x] **Step 2: Commit**

```bash
git add src/store/keyboard.ts
git commit -m "Escape resets map tool to navigation"
```

---

## Task 4: Update map-tool-changed listener for new enum

**Files:**
- Modify: `src/store/listeners/map-tool-changed.ts`
- Modify: `src/store/listeners/map-tool-changed.test.ts`

- [x] **Step 1: Rewrite test**

Replace `src/store/listeners/map-tool-changed.test.ts` with:

```ts
import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, test, beforeEach } from "vitest"
import app, { actions as appActions } from "../app"
import mapInteraction, { selectors as mapInteractionSelectors } from "../map-interaction"
import tools, { toolsSlice } from "../tools"
import mapToolChanged from "./map-tool-changed"

function makeStore() {
    return configureStore({
        reducer: { app, mapInteraction, tools },
        middleware: gDM => gDM().prepend(mapToolChanged.middleware),
    })
}

describe("map-tool-changed listener", () => {
    let store: ReturnType<typeof makeStore>

    beforeEach(() => {
        store = makeStore()
    })

    test("navigation enables dragPan, scrollZoom, dragRotate", () => {
        store.dispatch(appActions.setMapTool("select"))
        store.dispatch(appActions.setMapTool("navigation"))
        const state = store.getState()
        expect(mapInteractionSelectors.dragPan(state)).toBe(true)
        expect(mapInteractionSelectors.scrollZoom(state)).toBe(true)
        expect(mapInteractionSelectors.dragRotate(state)).toBe(true)
    })

    test("select disables dragPan and dragRotate", () => {
        store.dispatch(appActions.setMapTool("select"))
        const state = store.getState()
        expect(mapInteractionSelectors.dragPan(state)).toBe(false)
        expect(mapInteractionSelectors.dragRotate(state)).toBe(false)
    })

    test("info disables dragPan and dragRotate", () => {
        store.dispatch(appActions.setMapTool("info"))
        const state = store.getState()
        expect(mapInteractionSelectors.dragPan(state)).toBe(false)
        expect(mapInteractionSelectors.dragRotate(state)).toBe(false)
    })

    test("entering draw mode resets tool to navigation", () => {
        store.dispatch(appActions.setMapTool("select"))
        store.dispatch(toolsSlice.actions.setTool("draw"))
        expect(store.getState().app.mapTool).toBe("navigation")
    })
})
```

- [x] **Step 2: Run test to verify fail**

Run: `npx vitest run src/store/listeners/map-tool-changed.test.ts`
Expected: FAIL.

- [x] **Step 3: Rewrite `src/store/listeners/map-tool-changed.ts`**

```ts
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { DEFAULT_MAP_TOOL } from "@/lib/map-tools"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.app.setMapTool,
    effect: (action, listenerApi) => {
        switch (action.payload) {
            case "navigation": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(true))
                listenerApi.dispatch(actions.mapInteraction.setScrollZoom(true))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(true))
                break
            }
            case "select":
            case "info": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(false))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(false))
                break
            }
        }
    },
})

// Reset to navigation when entering draw mode so RectSelectOverlay unmounts
listener.startListening({
    actionCreator: actions.tools.setTool,
    effect: (action, listenerApi) => {
        if (action.payload === "draw") {
            const state = listenerApi.getState() as RootState
            if (state.app.mapTool !== DEFAULT_MAP_TOOL) {
                listenerApi.dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
    },
})

export default listener
```

Note: the Sources-tab reset is removed — tools are now global.

- [x] **Step 4: Run test to verify pass**

Run: `npx vitest run src/store/listeners/map-tool-changed.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/store/listeners/map-tool-changed.ts src/store/listeners/map-tool-changed.test.ts
git commit -m "Update map-tool-changed listener for new tool enum"
```

---

## Task 5: Add `hoverEntries` to properties slice

**Files:**
- Modify: `src/store/properties/index.ts`
- Modify: `src/store/properties/index.test.ts`

- [x] **Step 1: Add failing tests**

Append to `src/store/properties/index.test.ts` (or create if missing — use existing style):

```ts
import reducer, { propertiesSlice } from "./index"

const { setHover, resetHover } = propertiesSlice.actions

describe("properties slice — hoverEntries", () => {
    test("initial hoverEntries is undefined", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.hoverEntries).toBeUndefined()
    })

    test("setHover stores entries", () => {
        const state = reducer(
            undefined,
            setHover({ entries: [{ id: 1, values: { name: "A" } }] }),
        )
        expect(state.hoverEntries).toEqual([{ id: 1, values: { name: "A" } }])
    })

    test("resetHover clears entries", () => {
        const prev = reducer(undefined, setHover({ entries: [{ id: 1, values: {} }] }))
        const state = reducer(prev, resetHover())
        expect(state.hoverEntries).toBeUndefined()
    })

    test("setHover leaves selection entries (entries) untouched", () => {
        const prev = reducer(
            undefined,
            propertiesSlice.actions.set({ entries: [{ id: 2, values: { a: 1 } }] }),
        )
        const state = reducer(prev, setHover({ entries: [{ id: 1, values: {} }] }))
        expect(state.entries).toEqual([{ id: 2, values: { a: 1 } }])
        expect(state.hoverEntries).toEqual([{ id: 1, values: {} }])
    })
})
```

- [x] **Step 2: Run tests to verify fail**

Run: `npx vitest run src/store/properties/index.test.ts`
Expected: FAIL.

- [x] **Step 3: Update `src/store/properties/index.ts`**

```ts
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."

type Properties = Record<string, unknown>

export type PropertiesEntry = {
    id: string | number
    values: Properties
}

type PropertiesState = {
    entries?: PropertiesEntry[]
    hoverEntries?: PropertiesEntry[]
}

const initialState: PropertiesState = {}

export const propertiesSlice = createSlice({
    name: "properties",
    initialState,
    reducers: {
        reset: state => {
            state.entries = undefined
        },
        set: (state, action: PayloadAction<{ entries: PropertiesEntry | PropertiesEntry[] }>) => {
            state.entries = Array.isArray(action.payload.entries) ? action.payload.entries : [action.payload.entries]
        },
        resetHover: state => {
            state.hoverEntries = undefined
        },
        setHover: (state, action: PayloadAction<{ entries: PropertiesEntry[] }>) => {
            state.hoverEntries = action.payload.entries
        },
    },
})

const blacklist = new Set<string>()

function projectEntries(entries: PropertiesEntry[]) {
    return entries.map(entry => {
        const items = Object.keys(entry.values)
            .filter(key => !blacklist.has(key))
            .map(key => {
                const raw = entry.values[key]
                const value = typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw ?? "")
                return { key, value }
            })
        return { id: entry.id, items }
    })
}

export const selectProperties = (state: RootState) => {
    if (!state.properties.entries) {
        return null
    }
    return projectEntries(state.properties.entries)
}

export const selectHoverProperties = (state: RootState) => {
    if (!state.properties.hoverEntries) {
        return null
    }
    return projectEntries(state.properties.hoverEntries)
}

export default propertiesSlice.reducer
```

- [x] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/properties/index.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/store/properties/index.ts src/store/properties/index.test.ts
git commit -m "Add hoverEntries to properties slice"
```

---

## Task 6: Add `selectPopupVisible` + `selectPopupEntries` selectors

**Files:**
- Modify: `src/store/selectors.ts`
- Modify: `src/store/selectors.test.ts`

- [x] **Step 1: Locate existing selectors file**

Run: `npx tsc --noEmit` to check; open `src/store/selectors.ts` to see where to append. Add new selectors at the bottom.

- [x] **Step 2: Add failing tests**

Append to `src/store/selectors.test.ts`:

```ts
import type { RootState } from "."
import { selectPopupEntries, selectPopupVisible } from "./selectors"

function makeState(partial: {
    mapTool: "navigation" | "select" | "info"
    entries?: { id: number | string; values: Record<string, unknown> }[]
    hoverEntries?: { id: number | string; values: Record<string, unknown> }[]
}): RootState {
    return {
        app: { mapTool: partial.mapTool },
        properties: {
            entries: partial.entries,
            hoverEntries: partial.hoverEntries,
        },
    } as unknown as RootState
}

describe("selectPopupVisible", () => {
    test("true only for info", () => {
        expect(selectPopupVisible(makeState({ mapTool: "info" }))).toBe(true)
        expect(selectPopupVisible(makeState({ mapTool: "select" }))).toBe(false)
        expect(selectPopupVisible(makeState({ mapTool: "navigation" }))).toBe(false)
    })
})

describe("selectPopupEntries", () => {
    const selectionEntries = [{ id: 1, values: { k: "s" } }]
    const hoverEntries = [{ id: 2, values: { k: "h" } }]

    test("empty when popup not visible", () => {
        expect(
            selectPopupEntries(makeState({ mapTool: "navigation", entries: selectionEntries, hoverEntries })),
        ).toEqual([])
        expect(selectPopupEntries(makeState({ mapTool: "select", entries: selectionEntries, hoverEntries }))).toEqual(
            [],
        )
    })

    test("hover wins when info and hover is non-empty", () => {
        const result = selectPopupEntries(makeState({ mapTool: "info", entries: selectionEntries, hoverEntries }))
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(2)
    })

    test("selection is returned when hover is empty", () => {
        const result = selectPopupEntries(makeState({ mapTool: "info", entries: selectionEntries }))
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(1)
    })

    test("empty when both sources empty", () => {
        expect(selectPopupEntries(makeState({ mapTool: "info" }))).toEqual([])
    })
})
```

- [x] **Step 3: Run tests to verify fail**

Run: `npx vitest run src/store/selectors.test.ts`
Expected: FAIL.

- [x] **Step 4: Add selectors in `src/store/selectors.ts`**

Append at the bottom:

```ts
import { createSelector } from "@reduxjs/toolkit"
import { isPopupVisible } from "@/lib/map-tools"
import { selectHoverProperties, selectProperties } from "./properties"
import { selectMapTool } from "./app"

export const selectPopupVisible = createSelector([selectMapTool], tool => isPopupVisible(tool))

export const selectPopupEntries = createSelector(
    [selectMapTool, selectHoverProperties, selectProperties],
    (tool, hover, selection) => {
        if (!isPopupVisible(tool)) return []
        if (hover && hover.length > 0) return hover
        return selection ?? []
    },
)
```

If `selectors.ts` already has imports from `"./app"` or similar, consolidate; do not duplicate imports.

- [x] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/store/selectors.test.ts`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/store/selectors.ts src/store/selectors.test.ts
git commit -m "Add selectPopupVisible and selectPopupEntries selectors"
```

---

## Task 7: Gate `RectSelectOverlay` on Select+Info

**Files:**
- Modify: `src/components/SphereMap/RectSelectOverlay.tsx`

- [x] **Step 1: Edit the activation guard**

In `src/components/SphereMap/RectSelectOverlay.tsx`, replace the import and the guard:

Change the import line `import { selectMapTool } from "@/store/app"` to stay, and add:

```ts
import { isRectSelectEnabled } from "@/lib/map-tools"
```

Change:

```ts
    if (mapTool !== "select") {
        return null
    }
```

to:

```ts
    if (!isRectSelectEnabled(mapTool)) {
        return null
    }
```

Leave the rest of the file untouched. All existing drag/click dispatches to `rectSelect` actions continue to work for both Select and Info because they're tool-agnostic.

- [x] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: This file compiles. Other sites may still error — ignore for now.

- [x] **Step 3: Commit**

```bash
git add src/components/SphereMap/RectSelectOverlay.tsx
git commit -m "Activate RectSelectOverlay in Select and Info tools"
```

---

## Task 8: Simplify `src/hooks/useFeatureProperties.ts` to hover-only

**Files:**
- Modify: `src/hooks/useFeatureProperties.ts`
- Modify: `src/hooks/useFeatureProperties.test.ts`

Click-pin is now served by the selection pipeline (overlay → rectSelectClick → selection-changed listener → `properties.entries`). This hook only dispatches hover updates.

- [x] **Step 1: Rewrite `src/hooks/useFeatureProperties.test.ts`**

Replace with:

```ts
import { renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, test, vi, beforeEach } from "vitest"
import properties, { propertiesSlice } from "@/store/properties"
import useFeatureProperties from "./useFeatureProperties"
import type { MapRef } from "react-map-gl/maplibre"

type MoveHandler = (e: { point: { x: number; y: number } }) => void
type OutHandler = () => void

function makeFakeMap(features: GeoJSON.Feature[]) {
    let moveHandler: MoveHandler | null = null
    let outHandler: OutHandler | null = null
    const map = {
        on(event: string, handler: MoveHandler | OutHandler) {
            if (event === "mousemove") moveHandler = handler as MoveHandler
            if (event === "mouseout") outHandler = handler as OutHandler
            return { unsubscribe: () => {} }
        },
        queryRenderedFeatures: vi.fn(() => features),
    }
    return {
        ref: { getMap: () => map } as unknown as MapRef,
        fireMove: () => moveHandler?.({ point: { x: 0, y: 0 } }),
        fireOut: () => outHandler?.(),
    }
}

function wrap(store: ReturnType<typeof makeStore>) {
    return ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>
}

function makeStore() {
    return configureStore({ reducer: { properties } })
}

describe("useFeatureProperties (hover)", () => {
    let store: ReturnType<typeof makeStore>
    beforeEach(() => {
        store = makeStore()
    })

    test("mousemove dispatches setHover with entries", () => {
        const features = [{ type: "Feature", id: 1, properties: { name: "A" }, geometry: null } as unknown as GeoJSON.Feature]
        const { ref, fireMove } = makeFakeMap(features)
        renderHook(() => useFeatureProperties(ref, ["layer-a"], 0), { wrapper: wrap(store) })
        fireMove()
        expect(store.getState().properties.hoverEntries).toEqual([{ id: 1, values: { name: "A" } }])
    })

    test("mousemove with no features dispatches resetHover", () => {
        const { ref, fireMove } = makeFakeMap([])
        renderHook(() => useFeatureProperties(ref, ["layer-a"], 0), { wrapper: wrap(store) })
        store.dispatch(propertiesSlice.actions.setHover({ entries: [{ id: 1, values: {} }] }))
        fireMove()
        expect(store.getState().properties.hoverEntries).toBeUndefined()
    })

    test("mouseout dispatches resetHover", () => {
        const { ref, fireOut } = makeFakeMap([])
        renderHook(() => useFeatureProperties(ref, ["layer-a"], 0), { wrapper: wrap(store) })
        store.dispatch(propertiesSlice.actions.setHover({ entries: [{ id: 1, values: {} }] }))
        fireOut()
        expect(store.getState().properties.hoverEntries).toBeUndefined()
    })

    test("empty layerIds registers no listeners and clears hover", () => {
        const { ref } = makeFakeMap([])
        store.dispatch(propertiesSlice.actions.setHover({ entries: [{ id: 1, values: {} }] }))
        renderHook(() => useFeatureProperties(ref, [], 0), { wrapper: wrap(store) })
        expect(store.getState().properties.hoverEntries).toBeUndefined()
    })
})
```

- [x] **Step 2: Run tests to verify fail**

Run: `npx vitest run src/hooks/useFeatureProperties.test.ts`
Expected: FAIL.

- [x] **Step 3: Rewrite `src/hooks/useFeatureProperties.ts`**

```ts
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { toPropertiesEntries } from "@/lib/properties"
import { deduplicate } from "@/lib/array"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, layerIds: string[], _delay: number) {
    const dispatch = useAppDispatch()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || layerIds.length === 0) {
            dispatch(actions.properties.resetHover())
            return
        }

        const handleMove = map.on("mousemove", event => {
            const hovered = map.queryRenderedFeatures(event.point, { layers: layerIds })
            if (!hovered || hovered.length === 0) {
                dispatch(actions.properties.resetHover())
                return
            }
            const deduped = deduplicate(hovered, f => `${f.source ?? ""}:${f.sourceLayer ?? ""}:${f.id}`)
            dispatch(actions.properties.setHover({ entries: toPropertiesEntries(deduped) }))
        })

        const handleOut = map.on("mouseout", () => {
            dispatch(actions.properties.resetHover())
        })

        return () => {
            handleMove.unsubscribe()
            handleOut.unsubscribe()
        }
    }, [dispatch, ref, layerIds])
}
```

Note: `_delay` kept in signature for call-site compatibility; unused for now.

- [x] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/hooks/useFeatureProperties.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useFeatureProperties.ts src/hooks/useFeatureProperties.test.ts
git commit -m "Simplify useFeatureProperties to hover-only, write to hoverEntries"
```

---

## Task 9: Gate `sphere-hooks/useFeatureProperties` on Info tool

**Files:**
- Modify: `src/sphere-hooks/useFeatureProperties.ts`

- [x] **Step 1: Rewrite file**

```ts
import useFP from "@/hooks/useFeatureProperties"
import { isHoverPopupEnabled } from "@/lib/map-tools"
import { selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

const EMPTY: string[] = []

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectors.layer.selectSelectedId)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const mapTool = useAppSelector(selectMapTool)
    const hoverEnabled = isHoverPopupEnabled(mapTool)
    const effectiveLayerIds = !hoverEnabled || previewLayerIds.length > 0 || !layerId ? EMPTY : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}
```

- [x] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: This file compiles. Remaining errors unrelated.

- [x] **Step 3: Commit**

```bash
git add src/sphere-hooks/useFeatureProperties.ts
git commit -m "Gate sphere-hooks/useFeatureProperties on Info tool"
```

---

## Task 10: Remove `useFeatureSelect` (dead code)

Click-select in Select+Info is handled entirely by `RectSelectOverlay` → `rectSelect.click` action → `rect-select` listener. The `useFeatureSelect` hook is redundant.

**Files:**
- Delete: `src/sphere-hooks/useFeatureSelect.ts`
- Delete: `src/sphere-hooks/useFeatureSelect.test.tsx`
- Modify: `src/components/SphereMap/map-body.tsx`

- [x] **Step 1: Delete files**

```bash
rm src/sphere-hooks/useFeatureSelect.ts src/sphere-hooks/useFeatureSelect.test.tsx
```

- [x] **Step 2: Remove call in `src/components/SphereMap/map-body.tsx`**

Delete the import line:

```ts
import useFeatureSelect from "@/sphere-hooks/useFeatureSelect"
```

Delete the call inside `MapBody`:

```ts
    useFeatureSelect(map)
```

- [x] **Step 3: Run full test suite to confirm no regressions**

Run: `npm test -- --run`
Expected: All remaining tests pass. Note: any other test files that still reference removed symbols will fail; update those before continuing.

- [x] **Step 4: Commit**

```bash
git add -A src/sphere-hooks/ src/components/SphereMap/map-body.tsx
git commit -m "Remove useFeatureSelect (redundant with RectSelectOverlay)"
```

---

## Task 11: Update `MapToolbar` to 3 global tools

**Files:**
- Modify: `src/components/SphereMap/MapToolbar.tsx`

- [x] **Step 1: Replace file contents**

```tsx
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { DEFAULT_MAP_TOOL, type MapTool } from "@/lib/map-tools"
import { ActionIcon, Group } from "@mantine/core"
import { IconHandStop, IconInfoCircle, IconPointer } from "@tabler/icons"
import { useEffect } from "react"

type ToolSpec = { tool: MapTool; title: string; Icon: typeof IconHandStop }

const TOOLS: ToolSpec[] = [
    { tool: "navigation", title: "Navigation", Icon: IconHandStop },
    { tool: "select", title: "Select", Icon: IconPointer },
    { tool: "info", title: "Info", Icon: IconInfoCircle },
]

export default function MapToolbar() {
    const dispatch = useAppDispatch()
    const mapTool = useAppSelector(selectMapTool)

    // Escape key returns to default
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
        window.addEventListener("keydown", handler)
        return () => {
            window.removeEventListener("keydown", handler)
        }
    }, [dispatch])

    const zen = useAppSelector(selectors.app.isZen)
    if (zen) {
        return null
    }

    return (
        <Group
            spacing={4}
            style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                padding: "4px",
            }}
        >
            {TOOLS.map(({ tool, title, Icon }) => (
                <ActionIcon
                    key={tool}
                    size="md"
                    variant={mapTool === tool ? "filled" : "subtle"}
                    title={title}
                    onClick={() => dispatch(actions.app.setMapTool(tool))}
                >
                    <Icon size={16} />
                </ActionIcon>
            ))}
        </Group>
    )
}
```

- [x] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: This file compiles.

- [x] **Step 3: Commit**

```bash
git add src/components/SphereMap/MapToolbar.tsx
git commit -m "MapToolbar: 3 global tool buttons (navigation/select/info)"
```

---

## Task 12: Update `MapStatusbar` — 3-tool picker, rewire IconInfoCircle, add selected badge

**Files:**
- Modify: `src/components/MapStatusbar/index.tsx`

- [x] **Step 1: Edit imports and state**

At the top of `src/components/MapStatusbar/index.tsx`:

- Remove `selectShowFeatureProperties` from the `@/store/app` import.
- Remove `IconInfoCircle` stays (still used, rewired).
- Add import: `import { selectors } from "@/store"` if not already; use `selectors.selection` for count.

Replace the `mapTool`/`showFeatureProperties`/`showTools` block:

```ts
    const mapTool = useAppSelector(selectMapTool)
    const selectedCount = useAppSelector(selectors.selection.count)
```

Delete `const showFeatureProperties = useAppSelector(selectShowFeatureProperties)`, `const activeTab = useAppSelector(selectActiveSidebarTab)`, `const showTools = activeTab === "sources"`, and the `toggleFeatureProperties` callback.

- [x] **Step 2: Replace tool buttons block**

Replace the block that renders pan/select + info-popup buttons with:

```tsx
                <ActionIcon
                    color={mapTool === "navigation" ? "yellow" : undefined}
                    onClick={() => dispatch(actions.app.setMapTool("navigation"))}
                    title="Navigation"
                >
                    <IconHandStop size={16} />
                </ActionIcon>
                <ActionIcon
                    color={mapTool === "select" ? "yellow" : undefined}
                    onClick={() => dispatch(actions.app.setMapTool("select"))}
                    title="Select"
                >
                    <IconPointer size={16} />
                </ActionIcon>
                <ActionIcon
                    color={mapTool === "info" ? "yellow" : undefined}
                    onClick={() => dispatch(actions.app.setMapTool("info"))}
                    title="Info"
                >
                    <IconInfoCircle size={16} />
                </ActionIcon>
```

Remove the `{showTools && ...}` wrapping — tools are now global.

- [x] **Step 3: Add `selected=N` badge**

After the `sources={sources}` badge, before the `pitch` badge, add:

```tsx
                {selectedCount > 0 && (
                    <Badge className={s.widget} radius={"sm"} size="sm" variant="light">
                        selected={selectedCount}
                    </Badge>
                )}
```

- [x] **Step 4: Remove unused import**

If `selectActiveSidebarTab` is no longer referenced, remove its import. Same for `selectShowFeatureProperties`.

- [x] **Step 5: Verify compile**

Run: `npx tsc --noEmit`
Expected: This file compiles.

- [x] **Step 6: Commit**

```bash
git add src/components/MapStatusbar/index.tsx
git commit -m "MapStatusbar: 3-tool picker, selected=N badge, rewire IconInfoCircle"
```

---

## Task 13: Update `PropertiesPopup` to use new selectors

**Files:**
- Modify: `src/components/PropertiesPopup/index.tsx`

- [x] **Step 1: Replace file contents**

```tsx
import { useAppSelector } from "@/store/hooks"
import { selectPopupEntries, selectPopupVisible } from "@/store/selectors"
import { Overlay } from "@/ui/Overlay"
import { PropertiesViewer } from "@/ui/PropertiesViewer"
import { Container, Paper, Title } from "@mantine/core"

const CONTAINER_STYLE: React.CSSProperties = {
    minWidth: 300,
    height: "100%",
}

const PAPER_STYLE: React.CSSProperties = {
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
}

const BODY_STYLE: React.CSSProperties = {
    overflowY: "auto",
}

export default function PropertiesPopup() {
    const visible = useAppSelector(selectPopupVisible)
    const entries = useAppSelector(selectPopupEntries)
    if (!visible || entries.length === 0) {
        return null
    }

    return (
        <Overlay
            topRight={
                <Container pt={"lg"} style={CONTAINER_STYLE}>
                    <Paper p={"sm"} style={PAPER_STYLE}>
                        <Title order={3}>Properties</Title>
                        <div style={BODY_STYLE}>
                            {entries.map(x => (
                                <PropertiesViewer key={x.id} properties={x.items} />
                            ))}
                        </div>
                    </Paper>
                </Container>
            }
        />
    )
}
```

- [x] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: This file compiles.

- [x] **Step 3: Commit**

```bash
git add src/components/PropertiesPopup/index.tsx
git commit -m "PropertiesPopup: use selectPopupVisible + selectPopupEntries"
```

---

## Task 14: Full typecheck, test, lint, format

**Files:** whole project

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If failures remain, fix them in-place (these are trailing references to removed `"pan"` / `showFeatureProperties` in code or tests you didn't touch). Typical sites:
- `src/store/selectors.ts` (pre-existing selectors file) — search for `mapTool === "pan"` etc.
- Any test files mocking `selectShowFeatureProperties`.

- [ ] **Step 2: Full test run**

Run: `npm test -- --run`
Expected: All tests pass.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS. Fix any violations.

- [ ] **Step 4: Format**

Run: `npm run format`
Expected: No diff, or formatted diff applied.

- [ ] **Step 5: Commit any formatting/cleanup**

```bash
git add -A
git commit -m "Fix trailing references to old map tool values"
```

(Skip commit if no diff.)

---

## Task 15: Manual verification

- [ ] **Step 1: Run the app**

Run: `npm run tauri dev`

- [ ] **Step 2: Verify Navigation (default)**
  - App starts with Navigation tool active (highlighted in both MapToolbar and MapStatusbar).
  - Click on a feature: map pans, nothing gets selected.
  - Mouse wheel zooms. Drag pans.

- [ ] **Step 3: Verify Select**
  - Click Select button (in MapToolbar or Statusbar). Both pickers highlight.
  - Click a feature: it's selected. `selected=1` badge appears in statusbar.
  - Drag a rect: rect-select works. Badge updates.
  - Shift+click to add, Ctrl/Cmd+click to remove.
  - No popup shown.

- [ ] **Step 4: Verify Info**
  - Click Info button. Both pickers highlight.
  - Hover a feature: popup shows that feature's properties.
  - Move mouse to empty space: popup shows current selection (if any) or hides.
  - Click a feature: selection updates AND popup reflects the selected feature.
  - Rect-drag: still works; popup updates.

- [ ] **Step 5: Verify tab & Escape behavior**
  - Switch to Layers tab: tools still visible and functional.
  - Press Escape: tool resets to Navigation.
  - Enter Draw mode (if available): tool resets to Navigation, overlay unmounts.

- [ ] **Step 6: Close app**
