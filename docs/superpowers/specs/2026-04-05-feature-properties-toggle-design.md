# Map Status Bar Toggle: Feature Property Popup

**Date:** 2026-04-05

## Goal

Add a toggle to the map status bar that enables/disables the feature property popup triggered by map hover and click. When disabled, **no MapLibre event listeners are subscribed** for property lookup — it is a true zero-overhead disable, not a visual hide.

## Current Behavior

The property popup (properties slice → `PropertiesViewer` UI) is driven by two hooks:

- `src/hooks/useFeatureProperties.ts` — subscribes map-level `mousemove` / `mouseout` and writes to the `properties` slice on hover.
- `src/hooks/useFeatureClick.ts` — subscribes per-layer `click` and a map-level outside-click; feeds selected features into `useFeatureProperties`.

Both hooks already early-return and subscribe no listeners when `layerIds` is empty (`layerIds.length === 0`). This is the mechanism that the new toggle will reuse.

Callers of `useFeatureProperties`:
1. `src/components/SphereMap/map-body.tsx` → `src/sphere-hooks/useFeatureProperties.ts` (resolves `layerId` from the currently selected layer).
2. `src/components/SphereMap/SourcePreviewLayer.tsx` (passes preview-layer IDs for Sources tab preview).

## Design

### Redux state (`src/store/app.ts`)

Add to `AppState`:

```ts
showFeatureProperties: boolean  // default: true
```

Add reducer:

```ts
toggleFeatureProperties: state => {
    state.showFeatureProperties = !state.showFeatureProperties
}
```

Add selector:

```ts
export const selectShowFeatureProperties = (state: RootState) => state.app.showFeatureProperties
```

No persistence (session-only, per spec). Default `true` preserves current behavior.

### Hook gating (pass-through via `layerIds`)

`hooks/useFeatureProperties.ts` and `hooks/useFeatureClick.ts` stay pure (no Redux dependency). The Redux flag is read at the sphere-layer call sites; when `false`, the call sites substitute `EMPTY` for their computed layer IDs. The hooks' existing empty-array early-return then bypasses all listener subscription.

**1. `src/sphere-hooks/useFeatureProperties.ts`**

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

**2. `src/components/SphereMap/SourcePreviewLayer.tsx`**

Read `selectShowFeatureProperties`; when `false`, pass `EMPTY` to `useFeatureProperties` instead of the computed `layerIds`.

### Status bar UI (`src/components/MapStatusbar/index.tsx`)

Insert an `ActionIcon` with `IconInfoSquare` into the always-visible right-side group, positioned before `printViewport` (or adjacent to existing global toggles — final position determined during implementation with visual verification). Active styling matches the existing pattern used for `mapTool` and `isGlobe`:

```tsx
<ActionIcon
    color={showFeatureProperties ? "yellow" : undefined}
    onClick={() => dispatch(actions.app.toggleFeatureProperties())}
    title="Feature properties popup"
>
    <IconInfoSquare size={16} />
</ActionIcon>
```

## Testing

- `src/hooks/useFeatureProperties.test.ts` already covers the empty-`layerIds` path (no listeners subscribed). No new tests required for the pure hook layer.
- No existing test file for `src/sphere-hooks/useFeatureProperties.ts`. Optionally add a test verifying that the sphere-hook passes `EMPTY` when the flag is `false`.
- Manual verification: toggle off → hover/click on features produces no property updates and (inspected via MapLibre internals) no `mousemove`/`mouseout`/`click` subscriptions exist for property lookup.

## Out of Scope

- Persistence across reloads (localStorage / settings file)
- Separate toggles for hover vs. click
- Keyboard shortcut
- Changing the icon (user may revise later)
