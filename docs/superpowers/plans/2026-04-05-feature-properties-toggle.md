# Feature Properties Popup Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle in the map status bar that enables/disables the feature property popup (hover + click), fully unsubscribing MapLibre event listeners when off.

**Architecture:** A new boolean `showFeatureProperties` in the `app` Redux slice (default `true`, session-only). When off, the sphere-layer call sites of `useFeatureProperties` substitute `EMPTY` for their computed layer IDs, so the existing hook's empty-array early-return bypasses all listener subscription.

**Tech Stack:** React 18, Redux Toolkit, react-map-gl/MapLibre 5, Mantine 5, Tabler Icons.

---

## File Structure

- Modify: `src/store/app.ts` — add state field, reducer, selector
- Modify: `src/sphere-hooks/useFeatureProperties.ts` — read flag, pass EMPTY when disabled
- Modify: `src/components/SphereMap/SourcePreviewLayer.tsx` — read flag, pass EMPTY when disabled
- Modify: `src/components/MapStatusbar/index.tsx` — add toggle button

---

### Task 1: Add `showFeatureProperties` to app slice

**Files:**
- Modify: `src/store/app.ts`

- [ ] **Step 1: Add state field, reducer, and selector**

In `src/store/app.ts`:

Add `showFeatureProperties: boolean` to `AppState`:

```ts
type AppState = {
    version: string
    zenMode: boolean
    darkTheme: boolean
    showAttribution: boolean
    showLeftSidebar: boolean
    showRightSidebar: boolean
    activeSidebarTab: "sources" | "layers"
    mapTool: "pan" | "select"
    showFeatureProperties: boolean
}
```

Add to `initialState`:

```ts
const initialState: AppState = {
    version: "",
    zenMode: false,
    darkTheme: false,
    showAttribution: false,
    showLeftSidebar: true,
    showRightSidebar: true,
    activeSidebarTab: "sources",
    mapTool: "pan",
    showFeatureProperties: true,
}
```

Add reducer inside `reducers: { ... }`:

```ts
toggleFeatureProperties: state => {
    state.showFeatureProperties = !state.showFeatureProperties
},
```

Add selector after the other selectors at the bottom of the file:

```ts
export const selectShowFeatureProperties = (state: RootState) => state.app.showFeatureProperties
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run build`
Expected: build succeeds (or frontend tsc portion succeeds).

- [ ] **Step 3: Run format**

Run: `npm run format`
Expected: no diff issues, file formatted.

- [ ] **Step 4: Commit**

```bash
git add src/store/app.ts
git commit -m "feat: add showFeatureProperties flag to app slice"
```

---

### Task 2: Gate sphere-hook with the flag

**Files:**
- Modify: `src/sphere-hooks/useFeatureProperties.ts`

- [ ] **Step 1: Add flag read and gate `effectiveLayerIds`**

Replace the full content of `src/sphere-hooks/useFeatureProperties.ts` with:

```ts
import useFP from "@/hooks/useFeatureProperties"
import { selectors } from "@/store"
import { selectShowFeatureProperties } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

const EMPTY: string[] = []

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectors.layer.selectSelectedId)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const enabled = useAppSelector(selectShowFeatureProperties)
    const effectiveLayerIds =
        !enabled || previewLayerIds.length > 0 || !layerId ? EMPTY : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Run format**

Run: `npm run format`
Expected: no diff issues.

- [ ] **Step 4: Commit**

```bash
git add src/sphere-hooks/useFeatureProperties.ts
git commit -m "feat: gate feature properties hook with showFeatureProperties flag"
```

---

### Task 3: Gate source preview layer with the flag

**Files:**
- Modify: `src/components/SphereMap/SourcePreviewLayer.tsx`

- [ ] **Step 1: Add flag read and conditional layerIds**

In `src/components/SphereMap/SourcePreviewLayer.tsx`:

Add import at the top of the file (after the existing `selectors` import):

```ts
import { selectShowFeatureProperties } from "@/store/app"
```

Add a module-level constant outside the component (after the imports, before `SourcePreviewLayerProps`):

```ts
const EMPTY: string[] = []
```

Inside the `SourcePreviewLayer` component, replace the `useFeatureProperties(map, layerIds, delay)` line with:

```ts
const showFeatureProperties = useAppSelector(selectShowFeatureProperties)
const effectiveLayerIds = showFeatureProperties ? layerIds : EMPTY

useFeatureProperties(map, effectiveLayerIds, delay)
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Run format**

Run: `npm run format`
Expected: no diff issues.

- [ ] **Step 4: Commit**

```bash
git add src/components/SphereMap/SourcePreviewLayer.tsx
git commit -m "feat: gate source preview properties with showFeatureProperties flag"
```

---

### Task 4: Add toggle button to map status bar

**Files:**
- Modify: `src/components/MapStatusbar/index.tsx`

- [ ] **Step 1: Add icon import**

In `src/components/MapStatusbar/index.tsx`, add `IconInfoSquare` to the existing `@tabler/icons` import (keep alphabetical order):

```ts
import {
    IconHandStop,
    IconInfoSquare,
    IconLayoutSidebar,
    IconLiveView,
    IconMountain,
    IconMountainOff,
    IconNorthStar,
    IconPointer,
    IconSatellite,
    IconWorld,
    IconWorldOff,
} from "@tabler/icons"
```

- [ ] **Step 2: Import selector**

Add `selectShowFeatureProperties` to the existing import from `@/store/app`:

```ts
import {
    selectActiveSidebarTab,
    selectMapTool,
    selectShowFeatureProperties,
    selectShowLeftSidebar,
    selectVersion,
} from "@/store/app"
```

- [ ] **Step 3: Read flag and add toggle handler**

Inside the `MapStatusbar` component, next to the other `useAppSelector` calls (after `const mapTool = useAppSelector(selectMapTool)`), add:

```ts
const showFeatureProperties = useAppSelector(selectShowFeatureProperties)
```

Next to the other `useCallback` handlers (after `toggleSidebar`), add:

```ts
const toggleFeatureProperties = useCallback(() => {
    dispatch(actions.app.toggleFeatureProperties())
}, [dispatch])
```

- [ ] **Step 4: Render the toggle button**

In the JSX, insert a new `ActionIcon` before the `printViewport` `ActionIcon` (the one with `IconLiveView`). It should render between `{showTools && ( ... )}` and `<ActionIcon onClick={printViewport}>`:

```tsx
<ActionIcon
    color={showFeatureProperties ? "yellow" : undefined}
    onClick={toggleFeatureProperties}
    title="Feature properties popup"
>
    <IconInfoSquare size={16} />
</ActionIcon>
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Run format**

Run: `npm run format`
Expected: no diff issues.

- [ ] **Step 7: Manual verification**

Run: `npm run tauri dev`

Verify:
- Icon appears in the status bar at the right side (yellow by default = enabled).
- Clicking the icon toggles its color between yellow and default.
- When enabled: hovering a layer feature populates the property popup; clicking selects it.
- When disabled: hovering / clicking features does NOT update the property popup.
- (Optional inspect) In browser devtools, when disabled there are no `mousemove`/`mouseout`/`click` MapLibre subscriptions registered from the properties hooks — verifiable via MapLibre `_listeners` inspection or by confirming the early-return path runs.

- [ ] **Step 8: Commit**

```bash
git add src/components/MapStatusbar/index.tsx
git commit -m "feat: add feature properties popup toggle to map status bar"
```

---

## Self-Review

**Spec coverage:**
- Redux state `showFeatureProperties` with default `true`: Task 1 ✓
- Reducer `toggleFeatureProperties`: Task 1 ✓
- Selector `selectShowFeatureProperties`: Task 1 ✓
- Gate sphere-hook (handles `map-body.tsx` caller): Task 2 ✓
- Gate `SourcePreviewLayer.tsx` caller: Task 3 ✓
- `IconInfoSquare` button in MapStatusbar, always visible, right-side group: Task 4 ✓
- Default `true` preserves current behavior: Task 1 ✓
- No persistence, session-only: Task 1 (Redux only) ✓

**Placeholder scan:** No TBDs, no "similar to...", all code blocks included, all exact paths and strings present.

**Type consistency:** `showFeatureProperties` / `toggleFeatureProperties` / `selectShowFeatureProperties` used consistently across all four tasks. `EMPTY: string[]` typed identically in both call sites.
