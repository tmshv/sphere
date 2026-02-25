# Plan: Comprehensive Frontend Test Coverage

## Context

The frontend currently has ~40 tests covering 10 lib utility files (`src/lib/*.test.ts`). There are zero tests for Redux slices, selectors, or UI components. Adding comprehensive tests across all three areas creates a stable baseline for future refactoring and bug fixes.

---

## Phase 1: Install Dependencies & Configure Test Environment

Currently missing from `devDependencies` in `package.json`:
- `@testing-library/react` — render components
- `@testing-library/jest-dom` — DOM matchers (`toBeInTheDocument`, `toHaveTextContent`, etc.)
- `@testing-library/user-event` — user interaction simulation
- `jsdom` — browser-like environment for component tests

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Update `vite.config.ts`

Add `environmentMatchGlobs` so `.test.tsx` files run in `jsdom` while `.test.ts` files keep the default `node` env. Also add coverage thresholds to prevent regression:

```ts
test: {
  globals: true,
  include: ["**/*.test.ts", "**/*.test.tsx"],
  environmentMatchGlobs: [
    ["**/*.test.tsx", "jsdom"],
  ],
  setupFiles: ["./src/setupTests.ts"],
  coverage: {
    provider: "v8",
    thresholds: {
      lines: 50,
      functions: 50,
      branches: 40,
    },
  },
}
```

### Create `src/setupTests.ts`

```ts
import "@testing-library/jest-dom"
```

### Create `src/test-utils.tsx`

Custom render wrapper providing `MantineProvider` (required by all Mantine components):

```tsx
import { MantineProvider } from "@mantine/core"
import { render } from "@testing-library/react"

function AllProviders({ children }) {
    return <MantineProvider>{children}</MantineProvider>
}

function customRender(ui, options?) {
    return render(ui, { wrapper: AllProviders, ...options })
}

export * from "@testing-library/react"
export { customRender as render }
```

---

## Phase 2: Fix Existing Commented-Out Tests

`src/lib/predict-data-type.test.ts` lines 59–63 and 76–80 have commented-out tests for `YYYYmmdd` date format. The corresponding implementation in `isDate()` (lines 12–24 of `predict-data-type.ts`) is also commented out. These should remain commented until the feature is intentionally implemented — they are not broken tests, just dormant feature work. **No action needed here**, just document this in a code comment explaining the pairing.

---

## Phase 3: Missing Lib Tests (3 new files)

These lib functions exist but have no test coverage:

### `src/lib/stat.test.ts`
Tests `hist(values, bins)` from `src/lib/stat.ts`:
- Returns array of length `bins`
- Empty input produces all-zero histogram
- All same values concentrates count in one bin
- Uniform distribution spreads counts across bins

### `src/lib/source-reader-fix-id.test.ts`
Tests `SourceReaderFixId.fixIds()` from `src/lib/source-reader-fix-id.ts`:
- Mock `nextNumber` via `vi.mock("./nextId")`
- Features with numeric ids are left unchanged
- Features with string ids get id replaced with number, old id saved to `properties.$id`
- Features with null properties get `properties` object created

### `src/lib/index.test.ts`
Tests `assertUnreachable()` from `src/lib/index.ts`:
- Throws when called (runtime guard)
- TypeScript exhaustive check behavior (compile-time — document with comment)

---

## Phase 4: Redux Slice Tests (8 new files)

**Pattern**: Call `slice.reducer(currentState, slice.actions.actionName(payload))` directly. No full store needed for pure reducer tests.

**Selector pattern**: Call `selector({ sliceName: mockState, ...otherSlices })` with minimal RootState shape.

### `src/store/app.test.ts`
Tests `appSlice` from `src/store/app.ts`:

Reducers: `setVersion`, `toggleZenMode`, `toggleDarkTheme`, `setDarkTheme`, `showLeftSidebar`, `hideLeftSidebar`, `showRightSidebar`, `hideRightSidebar`

Selectors: `isZen`, `isDark`, attribution, sidebar visibility, version

### `src/store/draw.test.ts`
Tests `drawSlice` from `src/store/draw.ts`:

Reducers: `start` (sets sourceId), `done` (clears sourceId), `reset` (clears sourceId)

Selectors: `isDrawing` returns `true` when sourceId is set, `false` when undefined

### `src/store/error.test.ts`
Tests `errorSlice` from `src/store/error.ts`:

Reducers: `setError` (sets message), `clear` (unsets message)

Selector: `selectErrorMessage` returns the message from state

### `src/store/projection.test.ts`
Tests `projectionSlice` from `src/store/projection.ts`:

Reducers: `setGlobe` (sets "globe"), `setFlat` (sets "mercator")

Initial state: `"mercator"`

### `src/store/selection/index.test.ts`
Tests `selectionSlice` from `src/store/selection/index.ts`:

Reducers: `reset`, `selectSource`, `selectLayer`, `selectOne`

Selectors: `currentSourceId`, `currentLayerId`

Extra reducer: clearing `layerId` when layer is removed (dispatch `layerSlice.removeLayer`)

### `src/store/source/index.test.ts`
Tests `sourceSlice` from `src/store/source/index.ts`:

Key reducers:
- `addGeojsonSource` — adds to `items` and `allIds`, sets `lastAdded`
- `addMVTSource`, `addRasterSource` — same shape
- `removeSource` — removes from `items` and `allIds`
- `setName` — updates name of existing source
- `setData` — updates feature collection data

Selectors: `items`, `allIds`, `lastAdded`

### `src/store/layer/index.test.ts`
Tests `layerSlice` from `src/store/layer/index.ts`:

Key reducers:
- `addLayer` — adds to `items` and `allIds`
- `removeLayer` — removes from `items` and `allIds`
- `setVisible` — toggles visibility
- `setColor` — updates layer color
- `setName` — updates layer name
- `setType` — updates layer geometry type
- `setPositionBefore` / `setPositionAfter` — position ordering

Extra reducer: `sourceSlice.removeSource` clears `sourceId` from affected layers

### `src/store/selectors.test.ts`
Tests compound selectors from `src/store/selectors.ts`:

- `selectProjection` — returns "mercator" when drawing, else state projection
- `selectMapStyle` — returns STYLE_OSM when drawing, else state style
- `selectChangeProjectionAvailable` — false when drawing
- `visibleIds` (memoized) — only returns ids of visible layers

Use minimal mock `RootState` objects. No full store needed.

---

## Phase 5: Effect & Listener Middleware Tests (2 new files)

The issue flags these as missing. Both depend on Tauri APIs and require mocking via `vi.mock`.

### `src/store/effects/add-file.test.ts`
Tests `addFile` thunk from `src/store/effects/add-file.ts`:
- Mock `@tauri-apps/api/path` (`extname`) and `@tauri-apps/plugin-fs` (`readTextFile`)
- `.json` ext → dispatches `mapStyle.setMapStyle` with parsed JSON
- `.mbtiles` ext → dispatches `source.addFromUrl` with `sphere://mbtiles{path}` and `Raster` type
- Any other ext → dispatches `source.addFromUrl` with `sphere://source{path}` and `Geojson` type

### `src/store/listeners/add-source.test.ts`
Tests that `add-source` listener logs when `source.addFromUrl.fulfilled` fires. Since the listener body is mostly commented out and only calls `logger.info`, this is a smoke test confirming the middleware starts without error. Mock `@/logger`.

---

## Phase 6: Component Tests (3 new files)

Focus on components with no MapLibre or Tauri dependency. Use `render` from `src/test-utils.tsx`.

### `src/ui/ErrorFallback/index.test.tsx`
Tests `ErrorFallback` from `src/ui/ErrorFallback/index.tsx`:
- Renders "Something went wrong" heading
- Renders error message from `Error` object
- Renders string error directly
- "Try Again" button calls `resetErrorBoundary`
- Tests both `fullscreen` and `sidebar` variants render without crashing

### `src/ui/ActionBar/index.test.tsx`
Tests `ActionBar` from `src/ui/ActionBar/index.tsx`:
- Renders action icon for each non-null item
- Clicking an icon calls `onClick` with the item's `name`
- `null` items render as spacers (no icon)
- Disabled items don't call `onClick` when clicked

### `src/ui/Outline/index.test.tsx`
Tests `Outline` from `src/ui/Outline/index.tsx`:
- Non-draggable mode renders all items via `renderItem`
- Items use correct `key` (item.id)
- Empty items array renders without crash
- Draggable mode renders items wrapped in DndProvider (smoke test only)

---

## File Summary

| File                                            | Type      | Status                     |
|-------------------------------------------------|-----------|----------------------------|
| `package.json`                                  | config    | modify                     |
| `vite.config.ts`                                | config    | modify                     |
| `src/setupTests.ts`                             | new       | create                     |
| `src/test-utils.tsx`                            | new       | create                     |
| `src/lib/predict-data-type.test.ts`             | lib test  | comment clarification only |
| `src/lib/stat.test.ts`                          | lib test  | create                     |
| `src/lib/source-reader-fix-id.test.ts`          | lib test  | create                     |
| `src/lib/index.test.ts`                         | lib test  | create                     |
| `src/store/app.test.ts`                         | store     | create                     |
| `src/store/draw.test.ts`                        | store     | create                     |
| `src/store/error.test.ts`                       | store     | create                     |
| `src/store/projection.test.ts`                  | store     | create                     |
| `src/store/selection/index.test.ts`             | store     | create                     |
| `src/store/source/index.test.ts`                | store     | create                     |
| `src/store/layer/index.test.ts`                 | store     | create                     |
| `src/store/selectors.test.ts`                   | store     | create                     |
| `src/store/effects/add-file.test.ts`            | effect    | create                     |
| `src/store/listeners/add-source.test.ts`        | listener  | create                     |
| `src/ui/ErrorFallback/index.test.tsx`           | component | create                     |
| `src/ui/ActionBar/index.test.tsx`               | component | create                     |
| `src/ui/Outline/index.test.tsx`                 | component | create                     |

---

## Verification

```bash
npm test               # all tests pass
npm run coverage       # review coverage report
```

Expected: ~100+ new test cases across 3 categories. All existing tests continue to pass unchanged.

---

## Tasks

### Task 1: Install Dependencies & Configure Test Environment
- [x] Install @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom
- [x] Update vite.config.ts with environmentMatchGlobs and setupFiles
- [x] Create src/setupTests.ts
- [x] Create src/test-utils.tsx

### Task 2: Missing Lib Tests
- [ ] Create src/lib/stat.test.ts
- [ ] Create src/lib/source-reader-fix-id.test.ts
- [ ] Create src/lib/index.test.ts
- [ ] Add comment to src/lib/predict-data-type.test.ts about dormant tests

### Task 3: Redux Slice Tests (part 1)
- [ ] Create src/store/app.test.ts
- [ ] Create src/store/draw.test.ts
- [ ] Create src/store/error.test.ts
- [ ] Create src/store/projection.test.ts

### Task 4: Redux Slice Tests (part 2)
- [ ] Create src/store/selection/index.test.ts
- [ ] Create src/store/source/index.test.ts
- [ ] Create src/store/layer/index.test.ts
- [ ] Create src/store/selectors.test.ts

### Task 5: Effect & Listener Middleware Tests
- [ ] Create src/store/effects/add-file.test.ts
- [ ] Create src/store/listeners/add-source.test.ts

### Task 6: Component Tests
- [ ] Create src/ui/ErrorFallback/index.test.tsx
- [ ] Create src/ui/ActionBar/index.test.tsx
- [ ] Create src/ui/Outline/index.test.tsx
