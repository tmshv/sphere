# Three-tool map interaction model

Date: 2026-04-06

## Problem

Today the map has two separate controls that together determine click behavior, popup visibility, and selection:

- `app.mapTool`: `"pan" | "select"` — "pan" lets clicks select features; "select" enables rect-drag selection. Visible on the Sources tab only; resets to `"pan"` when leaving Sources.
- `app.showFeatureProperties`: global toggle for a hover-driven properties popup, rendered by `PropertiesPopup` from data maintained by `useFeatureProperties` (mousemove).

This has three problems:

1. **Navigation is not passive.** The default "pan" mode also click-selects features, so users cannot pan the map without accidentally mutating selection.
2. **Popup and selection are orthogonal axes with no ergonomic grouping.** Users must configure two unrelated toggles to reach common states.
3. **Scattered boolean logic.** Components compare `mapTool === "x"` in multiple places, making tool semantics hard to change centrally.

## Goal

Replace the two controls with a single three-value map tool: **Navigation**, **Select**, **Info**. Centralize tool capabilities in set-based selectors. Add a `selected=N` status-bar badge.

## Tool model

Replace `app.mapTool: "pan" | "select"` with:

```ts
type MapTool = "navigation" | "select" | "info"
```

| Tool       | Click selects | Rect-drag selects | Hover popup | Click pin popup |
|------------|---------------|-------------------|-------------|-----------------|
| Navigation | no            | no                | no          | no              |
| Select     | yes           | yes               | no          | no              |
| Info       | yes           | yes               | yes         | yes             |

- Selection IDs are shared across Select and Info. Switching between them preserves selection; only popup visibility changes.
- Navigation is the default on app startup.
- `Escape` resets to Navigation from any tool.
- This merges today's pan-click-select and rect-drag-select into one tool (Select). Info is a superset: Select behavior plus popup.

Remove `app.showFeatureProperties`, `toggleFeatureProperties` action, and `selectShowFeatureProperties` selector. Info tool subsumes popup visibility.

## Tool-capability sets and selectors

Define the capability sets in one place (`src/lib/map-tools.ts` or inline in `src/store/app.ts`):

```ts
const SELECTION_TOOLS   = new Set<MapTool>(["select", "info"])
const HOVER_POPUP_TOOLS = new Set<MapTool>(["info"])
const POPUP_VISIBLE_TOOLS = new Set<MapTool>(["info"])
```

Expose derived selectors. **Components consume only these selectors; they do not compare `mapTool` values directly.**

```ts
selectClickSelectEnabled   // SELECTION_TOOLS.has(tool)
selectRectSelectEnabled    // SELECTION_TOOLS.has(tool)
selectHoverPopupEnabled    // HOVER_POPUP_TOOLS.has(tool)
selectPopupVisible         // POPUP_VISIBLE_TOOLS.has(tool)
```

## Popup content policy

In Info mode the popup shows hover entries when hovering, otherwise falls back to selection-derived entries. Implemented as a single selector so no component contains hover-or-selection branching:

```ts
selectPopupEntries = createSelector(
    [selectHoverEntries, selectSelectionEntries, selectActiveMapTool],
    (hover, selection, tool) =>
        POPUP_VISIBLE_TOOLS.has(tool)
            ? hover.length > 0 ? hover : selection
            : [],
)
```

`selectHoverEntries` = the current properties slice entries populated by `useFeatureProperties`.
`selectSelectionEntries` = property rows for IDs in the `selection` slice. Loaded by a listener on `selection/sync` that calls `source_get_slice` with `(sourceId, ids)`, parses the returned GeoJSON, and stores the property rows in a new `selection.entries` field (or a sibling slice). This keeps the popup a pure render of selector output.

## UI surfaces

Both tool pickers stay in sync. Three buttons each, shared icons:

- Navigation: `IconHandStop`
- Select: `IconPointer`
- Info: `IconInfoCircle`

### Floating `MapToolbar` (`src/components/SphereMap/MapToolbar.tsx`)

- Remove the `activeTab === "sources"` guard — visible on all tabs.
- Drop the `useEffect` that resets tool to `"pan"` on leaving Sources.
- Render three buttons; active button uses `variant="filled"`.

### `MapStatusbar` (`src/components/MapStatusbar/index.tsx`)

- Replace the existing pan/select buttons with the three-tool picker.
- Reuse the existing `IconInfoCircle` button — rewire from `toggleFeatureProperties` to `setMapTool("info")`. Active when `mapTool === "info"`.
- Drop the `activeTab === "sources"` guard on tool buttons.
- Add a `selected=N` Mantine `Badge` next to `sources=N`, rendered only when `selection.count > 0`.

## Escape key

The Escape handler in `MapToolbar` (or equivalent global handler) dispatches `setMapTool("navigation")`.

## Consumers

- **`useFeatureSelect`** (`src/sphere-hooks/useFeatureSelect.ts`) — register click handler when `selectClickSelectEnabled`. Navigation → no-op.
- **`RectSelectOverlay`** (`src/components/SphereMap/RectSelectOverlay.tsx`) — active when `selectRectSelectEnabled`.
- **`useFeatureProperties`** (`src/hooks/useFeatureProperties.ts`) — mousemove/mouseout subscription gated by `selectHoverPopupEnabled`. Returns immediately and does not register listeners when disabled.
- **`PropertiesPopup`** (`src/components/PropertiesPopup/index.tsx`) — gated by `selectPopupVisible`. Renders `selectPopupEntries`.

## Tests

- `src/store/app.test.ts` — tool transitions (navigation → select → info → navigation); Escape resets to navigation.
- New selector tests for each capability selector across all three tool values.
- `src/store/listeners/map-tool-changed.test.ts` — update for new values.
- `src/sphere-hooks/useFeatureSelect.test.tsx` — click handler registered in select and info, not in navigation.
- `RectSelectOverlay` — activation in select and info.
- `PropertiesPopup` — popup visibility; content policy (hover-else-selection).
- `MapStatusbar` — `selected=N` badge hidden at 0, visible at >0.

## Out of scope

- Keyboard shortcuts to switch tools (V/S/I or similar).
- Per-tab tool memory — tool state is global and persists across tab switches.
- Restructuring the `tools` slice (`navigation`/`draw`) — orthogonal to this change.
