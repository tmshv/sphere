# Source Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a map preview of the selected file source (GeoJSON/FeatureCollection) when a source is active in the Sources tab, with clickable features that display properties in the existing PropertiesPopup.

**Architecture:** Add `activeSidebarTab` to the `app` Redux slice so the map knows which tab is active. A new `SourcePreviewLayer` component renders three geometry-filtered MapLibre layers (point/line/polygon) on top of the already-registered source in MapLibre. Feature clicks dispatch to the existing `properties` slice, so `PropertiesPopup` shows automatically. Extend `useFeatureClick` to accept an array of layer IDs so the single hook covers all three preview layers.

**Tech Stack:** React, Redux Toolkit, react-map-gl/maplibre, MapLibre GL, Mantine 5, Vitest

**Issue:** https://github.com/tmshv/sphere/issues/138

---

## File Map

| Action  | File                                                   | Responsibility                                        |
|---------|--------------------------------------------------------|-------------------------------------------------------|
| Modify  | `src/hooks/useFeatureClick.ts`                         | Accept `string \| string[] \| undefined` for layerId |
| Modify  | `src/store/app.ts`                                     | Add `activeSidebarTab` state, action, selector        |
| Modify  | `src/store/app.test.ts`                                | Tests for new reducer and selector                    |
| Modify  | `src/components/LeftSidebar/index.tsx`                 | Dispatch `setActiveSidebarTab` on tab change          |
| Create  | `src/components/SphereMap/SourcePreviewLayer.tsx`      | Render preview layers for selected file source        |
| Modify  | `src/components/SphereMap/map-body.tsx`                | Mount `<SourcePreviewLayer />`                        |

---

### Task 1: Extend `useFeatureClick` to accept array of layer IDs

**Files:**
- Modify: `src/hooks/useFeatureClick.ts`

**Context:** Currently takes `layerId: string | undefined`. For source preview we need to register click handlers on 3 layer IDs simultaneously. The outside-click clear must fire only when the user clicks outside ALL of them, so a shared `clickTime` variable tracks the most recent feature click across all registered handlers.

- [x] **Step 1: Update the function signature and implementation**

Replace the contents of `src/hooks/useFeatureClick.ts` with:

```typescript
import type { Map as MaplibreMap, MapGeoJSONFeature } from "maplibre-gl"
import { useEffect, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureClick(
    ref: MapRef | undefined,
    layerId: string | string[] | undefined,
    delay: number,
) {
    const [features, setFeatures] = useState<MapGeoJSONFeature[] | undefined>()

    useEffect(() => {
        const map = ref?.getMap() as MaplibreMap | undefined
        if (!map) {
            return
        }
        const ids = Array.isArray(layerId) ? layerId : layerId ? [layerId] : []
        if (ids.length === 0) {
            return
        }

        let clickTime = 0

        const layerListeners = ids.map(id =>
            map.on("click", id, event => {
                if (!event.features) {
                    return
                }
                clickTime = Date.now()
                setFeatures(event.features)
            }),
        )

        const clickOutside = map.on("click", () => {
            if (Date.now() - clickTime < delay) {
                return
            }
            setFeatures(undefined)
        })

        return () => {
            for (const listener of layerListeners) {
                listener.unsubscribe()
            }
            clickOutside.unsubscribe()
        }
    }, [ref, layerId, delay])

    return features
}
```

- [x] **Step 2: Run tests to confirm no regressions**

```bash
npm test -- --run src/hooks
```

Expected: all pass (no test file for `useFeatureClick` — absence is fine).

- [x] **Step 3: Commit**

```bash
git add src/hooks/useFeatureClick.ts
git commit -m "feat: extend useFeatureClick to accept string | string[] layerId"
```

---

### Task 2: Add `activeSidebarTab` to app slice

**Files:**
- Modify: `src/store/app.ts`
- Modify: `src/store/app.test.ts`

**Context:** `SourcePreviewLayer` needs to know whether the sources tab is active. Store it in the `app` slice as `activeSidebarTab: 'sources' | 'layers'`, defaulting to `'sources'` (matching `LeftSidebar`'s `defaultValue`).

- [x] **Step 1: Write the failing tests**

Add imports to `src/store/app.test.ts`:

```typescript
import reducer, {
    appSlice,
    selectActiveSidebarTab,
    selectShowAttribution,
    selectShowLeftSidebar,
    selectShowRightSidebar,
    selectVersion,
} from "./app"
```

Add `setActiveSidebarTab` to the actions destructure at the top:

```typescript
const {
    setVersion, toggleZenMode, toggleDarkTheme, setDarkTheme,
    showLeftSidebar, hideLeftSidebar, showRightSidebar, hideRightSidebar,
    setActiveSidebarTab,
} = appSlice.actions
```

Add to the `describe("appSlice reducer")` block:

```typescript
test("initial activeSidebarTab is sources", () => {
    const state = reducer(undefined, { type: "@@INIT" })
    expect(state.activeSidebarTab).toBe("sources")
})

test("setActiveSidebarTab sets to layers", () => {
    const state = reducer(undefined, setActiveSidebarTab("layers"))
    expect(state.activeSidebarTab).toBe("layers")
})

test("setActiveSidebarTab sets to sources", () => {
    const prev = { ...reducer(undefined, { type: "@@INIT" }), activeSidebarTab: "layers" as const }
    const state = reducer(prev, setActiveSidebarTab("sources"))
    expect(state.activeSidebarTab).toBe("sources")
})
```

Add to the `describe("app RootState selectors")` block:

```typescript
test("selectActiveSidebarTab returns activeSidebarTab", () => {
    expect(selectActiveSidebarTab(makeRootState({ activeSidebarTab: "layers" }))).toBe("layers")
    expect(selectActiveSidebarTab(makeRootState({ activeSidebarTab: "sources" }))).toBe("sources")
})
```

- [x] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/store/app.test.ts
```

Expected: FAIL — `setActiveSidebarTab` not found, `selectActiveSidebarTab` not found.

- [x] **Step 3: Update `src/store/app.ts`**

Add `activeSidebarTab` to `AppState` and `initialState`:

```typescript
type AppState = {
    version: string
    zenMode: boolean
    darkTheme: boolean
    showAttribution: boolean
    showLeftSidebar: boolean
    showRightSidebar: boolean
    activeSidebarTab: "sources" | "layers"
}

const initialState: AppState = {
    version: "",
    zenMode: false,
    darkTheme: false,
    showAttribution: false,
    showLeftSidebar: true,
    showRightSidebar: true,
    activeSidebarTab: "sources",
}
```

Add to `reducers`:

```typescript
setActiveSidebarTab: (state, action: PayloadAction<"sources" | "layers">) => {
    state.activeSidebarTab = action.payload
},
```

Add selector after existing ones:

```typescript
export const selectActiveSidebarTab = (state: RootState) => state.app.activeSidebarTab
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/store/app.test.ts
```

Expected: all pass.

- [x] **Step 5: Commit**

```bash
git add src/store/app.ts src/store/app.test.ts
git commit -m "feat: add activeSidebarTab to app slice"
```

---

### Task 3: Wire LeftSidebar tab change to Redux

**Files:**
- Modify: `src/components/LeftSidebar/index.tsx`

**Context:** Mantine `Tabs` fires `onTabChange` with the new tab value. Dispatch `setActiveSidebarTab` when it changes to `'sources'` or `'layers'`. Check `src/store/actions.ts` to verify how `app` actions are exported and follow the same pattern.

- [x] **Step 1: Check how app actions are exported**

```bash
grep -n "app" src/store/actions.ts
```

If `app` actions are not yet in the actions barrel, add them following the existing pattern.

- [x] **Step 2: Update `LeftSidebar`**

Add imports and dispatch logic to `src/components/LeftSidebar/index.tsx`:

```typescript
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
```

Add inside `LeftSidebar`:

```typescript
const dispatch = useAppDispatch()

const handleTabChange = (value: string) => {
    if (value === "sources" || value === "layers") {
        dispatch(actions.app.setActiveSidebarTab(value))
    }
}
```

Add `onTabChange={handleTabChange}` to `<StyledTabs>`.

- [x] **Step 3: Run lint + tests**

```bash
npm run lint && npm test -- --run
```

Expected: no errors, all tests pass.

- [x] **Step 4: Commit**

```bash
git add src/components/LeftSidebar/index.tsx src/store/actions.ts
git commit -m "feat: dispatch setActiveSidebarTab on sidebar tab change"
```

---

### Task 4: Create `SourcePreviewLayer` component

**Files:**
- Create: `src/components/SphereMap/SourcePreviewLayer.tsx`

**Context:** `SphereSource` already registers all sources as MapLibre sources (including GeoJSON fetched via Tauri and FeatureCollection from Redux). `SourcePreviewLayer` only adds `<Layer>` components — no `<Source>` needed. Active when `activeSidebarTab === "sources"` AND a file source (`SourceType.Geojson` or `SourceType.FeatureCollection`) is selected. Preview layer IDs use the prefix `preview-${sourceId}-` to avoid collisions with user layers. Style mirrors existing layer components (see `PointLayer.tsx`, `ShpereLineStringLayer.tsx`, `SpherePolygonLayer.tsx`) using blue[7] = `#1c7ed6`.

- [x] **Step 1: Create `src/components/SphereMap/SourcePreviewLayer.tsx`**

```typescript
import useFeatureClick from "@/hooks/useFeatureClick"
import { actions } from "@/store"
import { selectActiveSidebarTab } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import type { RootState } from "@/store"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import { Layer, useMap } from "react-map-gl/maplibre"

const PREVIEW_COLOR = "#1c7ed6"

const selectPreviewSourceId = createSelector(
    [
        (state: RootState) => state.selection.sourceId,
        (state: RootState) => state.source.items,
        selectActiveSidebarTab,
    ],
    (sourceId, items, tab) => {
        if (tab !== "sources") return undefined
        if (!sourceId) return undefined
        const source = items[sourceId]
        if (!source) return undefined
        if (source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) return undefined
        return sourceId
    },
)

export type SourcePreviewLayerProps = {
    mapId: string
    delay: number
}

export function SourcePreviewLayer({ mapId, delay }: SourcePreviewLayerProps) {
    const dispatch = useAppDispatch()
    const { [mapId]: map } = useMap()
    const sourceId = useAppSelector(selectPreviewSourceId)

    const layerIds = sourceId
        ? [
              `preview-${sourceId}-point`,
              `preview-${sourceId}-line`,
              `preview-${sourceId}-polygon`,
          ]
        : undefined

    const features = useFeatureClick(map, layerIds, delay)

    useEffect(() => {
        if (!features) {
            dispatch(actions.properties.reset())
            return
        }
        dispatch(actions.properties.set({ values: features.map(f => f.properties) }))
    }, [dispatch, features])

    if (!sourceId) {
        return null
    }

    const pointId = `preview-${sourceId}-point`
    const lineId = `preview-${sourceId}-line`
    const polygonId = `preview-${sourceId}-polygon`

    return (
        <>
            {/* Points: circle + stroke */}
            <Layer
                id={pointId}
                source={sourceId}
                type="circle"
                filter={["==", ["geometry-type"], "Point"]}
                paint={{
                    "circle-color": PREVIEW_COLOR,
                    "circle-radius": 4,
                    "circle-stroke-color": "white",
                    "circle-stroke-width": 1,
                }}
            />
            {/* Lines: casing then fill */}
            <Layer
                id={`${lineId}-outline`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "LineString"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "#fff", "line-width": 3 }}
            />
            <Layer
                id={lineId}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "LineString"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
            {/* Polygons: fill + double outline */}
            <Layer
                id={polygonId}
                source={sourceId}
                type="fill"
                filter={["==", ["geometry-type"], "Polygon"]}
                paint={{ "fill-color": PREVIEW_COLOR, "fill-opacity": 0.25 }}
            />
            <Layer
                id={`${polygonId}-outline-0`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "Polygon"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "white", "line-width": 1, "line-offset": -1 }}
            />
            <Layer
                id={`${polygonId}-outline-1`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "Polygon"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
        </>
    )
}
```

- [x] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/SphereMap/SourcePreviewLayer.tsx
git commit -m "feat: add SourcePreviewLayer component for source map preview"
```

---

### Task 5: Mount `SourcePreviewLayer` in `MapBody`

**Files:**
- Modify: `src/components/SphereMap/map-body.tsx`

**Context:** Mount after the `sourceIds.map(...)` block so MapLibre sources are registered before the preview layers reference them. Pass the same `mapId` already available in `MapBody` and `delay={50}` matching `useFeatureProperties`.

- [ ] **Step 1: Import and mount**

Add import in `src/components/SphereMap/map-body.tsx`:

```typescript
import { SourcePreviewLayer } from "./SourcePreviewLayer"
```

Add inside the JSX return after `{sourceIds.map(id => <SphereSource key={id} id={id} />)}`:

```typescript
<SourcePreviewLayer mapId={mapId} delay={50} />
```

- [ ] **Step 2: Run lint + full test suite**

```bash
npm run lint && npm test -- --run
```

Expected: no errors, all tests pass.

- [ ] **Step 3: Build to verify no type errors**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/SphereMap/map-body.tsx
git commit -m "feat: mount SourcePreviewLayer in MapBody"
```
