# Issue #186: Properties Window Selected Filter

**Goal:** Fix the "Selected" filter in the properties window and restore the page size selector, moving both controls into the statusbar.

**Architecture:** The properties window statusbar currently only has page navigation. We add the page size selector (`Statusbar/Select`) and the All/Selected toggle (`SegmentedControl`) into the statusbar. The page size becomes stateful and flows from `properties.tsx` through `PropertiesTable` props. The "Selected" filter bug is a sourceId mismatch between the `properties-set` and `properties-selection-changed` events — we fix the listener to always use the canonical sourceId.

**Tech Stack:** React, Mantine, TanStack Table, Tauri IPC

---

## File Structure

| File                              | Action | Responsibility                                                  |
|-----------------------------------|--------|-----------------------------------------------------------------|
| `src/properties.tsx`              | Modify | Add `pageSize` state, remove `SegmentedControl` from above table, pass new props down |
| `src/ui/PropertiesTable/index.tsx`| Modify | Accept `pageSize`, `attributeFilter`, `onAttributeFilterChange`, `onPageSizeChange` props; render controls in statusbar |

---

### Task 1: Add page size selector to statusbar

**Files:**
- Modify: `src/properties.tsx:81,196-221`
- Modify: `src/ui/PropertiesTable/index.tsx:126-135,482-515`

- [x] **Step 1: Add `pageSize` state and pass it to PropertiesTable**

In `src/properties.tsx`, replace the hardcoded constant and thread it through:

```tsx
// Replace line 81:
// const PAGE_SIZE = 50
// With:
const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000]
const DEFAULT_PAGE_SIZE = 50
```

Inside `View`, add state:

```tsx
const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
```

Reset `pageIndex` when `pageSize` changes — add a handler:

```tsx
const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPageIndex(0)
}, [])
```

Replace all remaining `PAGE_SIZE` references with `pageSize` (lines 158, 170, 194).

Update `<PropertesTable>` props to include:

```tsx
<PropertesTable
    columns={columns}
    meta={meta}
    data={rows}
    pageIndex={pageIndex}
    pageCount={totalPages}
    pageSize={pageSize}
    pageSizeOptions={PAGE_SIZE_OPTIONS}
    sorting={sorting}
    onPageChange={setPageIndex}
    onPageSizeChange={handlePageSizeChange}
    onSortingChange={handleSortingChange}
/>
```

- [x] **Step 2: Accept new props in PropertiesTable and render the Select**

In `src/ui/PropertiesTable/index.tsx`, update `PropertyTableProps`:

```tsx
type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
    meta: Record<string, PropertyItemMeta>
    pageIndex: number
    pageCount: number
    pageSize: number
    pageSizeOptions: number[]
    sorting: SortingState
    onPageChange: (index: number) => void
    onPageSizeChange: (size: number) => void
    onSortingChange: OnChangeFn<SortingState>
}
```

Destructure the new props in the component signature.

Update the `pagination` state in `useReactTable` to use the prop:

```tsx
pagination: { pageIndex, pageSize },
```

Add the `Select` import at the top:

```tsx
import { Statusbar, Select } from "@/ui/Statusbar"
```

In the `<Statusbar>`, after the page navigation controls and before the spacer `<Box>`, add:

```tsx
<Select
    className={cx(s.widget, s.widgetSelect)}
    value={pageSize}
    options={pageSizeOptions}
    onChange={onPageSizeChange}
/>
```

- [x] **Step 3: Run tests and format**

Run: `npm test -- --run`
Run: `npm run format`
Expected: all tests pass, no format issues.

- [x] **Step 4: Commit**

```bash
git add src/properties.tsx src/ui/PropertiesTable/index.tsx
git commit -m "Restore page size selector in properties statusbar"
```

---

### Task 2: Move All/Selected toggle into statusbar

**Files:**
- Modify: `src/properties.tsx:91,196-221`
- Modify: `src/ui/PropertiesTable/index.tsx:126-135,482-515`

- [ ] **Step 1: Remove SegmentedControl from properties.tsx, pass filter as props**

In `src/properties.tsx`, remove the `SegmentedControl` import from `@mantine/core` (keep `Box` and `createStyles`).

Remove the `<SegmentedControl>` JSX block (lines 198-210).

Pass `attributeFilter` and its setter to `PropertesTable`:

```tsx
<PropertesTable
    columns={columns}
    meta={meta}
    data={rows}
    pageIndex={pageIndex}
    pageCount={totalPages}
    pageSize={pageSize}
    pageSizeOptions={PAGE_SIZE_OPTIONS}
    attributeFilter={attributeFilter}
    sorting={sorting}
    onPageChange={setPageIndex}
    onPageSizeChange={handlePageSizeChange}
    onAttributeFilterChange={setAttributeFilter}
    onSortingChange={handleSortingChange}
/>
```

- [ ] **Step 2: Accept filter props in PropertiesTable and render in statusbar**

In `src/ui/PropertiesTable/index.tsx`, add to `PropertyTableProps`:

```tsx
attributeFilter: "all" | "selected"
onAttributeFilterChange: (value: "all" | "selected") => void
```

Add `SegmentedControl` import:

```tsx
import { SegmentedControl } from "@mantine/core"
```

In the `<Statusbar>`, render the toggle on the right side (after the `<Box style={{ flex: 1 }} />` spacer):

```tsx
<Box style={{ flex: 1 }} />

<SegmentedControl
    size="xs"
    value={attributeFilter}
    onChange={v => {
        if (v === "all" || v === "selected") {
            onAttributeFilterChange(v)
        }
    }}
    data={[
        { label: "All", value: "all" },
        { label: "Selected", value: "selected" },
    ]}
/>
```

- [ ] **Step 3: Run tests and format**

Run: `npm test -- --run`
Run: `npm run format`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/properties.tsx src/ui/PropertiesTable/index.tsx
git commit -m "Move All/Selected toggle into properties statusbar"
```

---

### Task 3: Fix "Selected" filter not returning data

**Files:**
- Modify: `src/properties.tsx:147-175`
- Modify: `src/store/listeners/selection-changed.ts:20-48`

The bug: when the user selects features on the map and switches to "Selected", the table is empty. Root cause analysis:

1. The `selection-changed` listener (line 25-28) resolves `sourceId` by falling back through `state.selection.sourceId ?? state.source.selectedId ?? layer lookup`. This resolved ID may differ from the `sourceId` sent to the properties window via `"properties-set"`.
2. In `properties.tsx:148`, `isSelectionActive` requires `selectionData.sourceId === sourceId`. If the IDs don't match, the selection fetch never fires.
3. Additionally, when `attributeFilter` is toggled to `"selected"` *after* features were already selected, `selectionVersion` may already be > 0 but the effect won't re-fire because none of its deps changed at that moment — `isSelectionActive` flips from false to true, but that IS in the dep array, so this path should work. The real issue is the sourceId mismatch.

- [ ] **Step 1: Ensure selection-changed listener sends a consistent sourceId**

In `src/store/listeners/selection-changed.ts`, the listener resolves `sourceId` from multiple Redux fields. The properties window receives its `sourceId` from `showProperties.ts` which reads `state.source.selectedId`. The listener must use the same resolution.

Current code (lines 24-28):

```ts
const count = state.selection.count
const sourceId =
    state.selection.sourceId ??
    state.source.selectedId ??
    (state.layer.selectedId ? state.layer.items[state.layer.selectedId]?.sourceId : undefined)
```

This is already correct in principle — it tries `selection.sourceId` first (set by `sync` action in `useFeatureSelect`), then falls back. The problem is that `useFeatureSelect` calls `resolveSourceId(f.source, ...)` which may return a different ID than the raw source ID stored in `state.source.selectedId`.

Fix: in `notifyPropertiesWindow`, also send the `sourceId` so the properties window can update its own reference. Change `"properties-selection-changed"` payload to include `sourceId`:

In `src/properties.tsx`, when receiving `"properties-selection-changed"`, if the `sourceId` in the payload differs from the current `sourceId` state, skip (don't crash) — but also handle the case where the properties window was opened for a source and features are selected from the same underlying source with a different resolved ID.

Actually, the simpler fix: make `isSelectionActive` not require sourceId match. The `selectionQueryPage` IPC uses the backend's `SelectionStorage` which is global — it already knows which features are selected. The `sourceId` param to `selectionQueryPage` just identifies which `FeatureStore` to query against. So we should pass the sourceId from `selectionData` (from the selection-changed event) rather than requiring it to match the properties window's sourceId.

Replace `isSelectionActive` check in `src/properties.tsx`:

```ts
const isSelectionActive =
    attributeFilter === "selected" && selectionData !== null && selectionData.count > 0
```

And in the selection fetch effect, use `selectionData.sourceId` instead of `sourceId` when they differ — but actually `selectionQueryPage` needs to query the correct FeatureStore. The properties window's `sourceId` IS the correct store. The mismatch is that `selectionData.sourceId` may be a resolved/internal ID.

Simplest correct fix: drop the sourceId comparison from `isSelectionActive` entirely and always use the properties window's `sourceId` for the query:

```ts
const isSelectionActive =
    attributeFilter === "selected" && selectionData !== null && selectionData.count > 0
```

The selection fetch effect already uses the properties window's `sourceId`:

```ts
selectionQueryPage(sourceId, pageIndex * PAGE_SIZE, PAGE_SIZE, sortCol, sortAsc)
```

This is correct — the backend's `selection_query_page` uses `SelectionStorage` for the IDs and `SourceStorage[source_id]` for the feature data. Both are global/correct.

- [ ] **Step 2: Handle zero-selection edge case**

When `selectionData.count === 0` and `attributeFilter === "selected"`, `isSelectionActive` is false, so the "all" fetch effect fires. This is the desired behavior — showing all features when nothing is selected in "Selected" mode would be confusing. Instead, the table should show an empty result.

Add a guard: when `attributeFilter === "selected"` and `selectionData?.count === 0`, set an empty page instead of fetching all:

In the "all" fetch effect (line 151), add `attributeFilter` to the guard:

```ts
useEffect(() => {
    if (!sourceId || isSelectionActive) return
    if (attributeFilter === "selected") {
        setPage({ features: [], total_matching: 0, offset: 0, limit: pageSize })
        return
    }
    // ... existing fetch logic
}, [sourceId, pageIndex, sorting, filterExpression, isSelectionActive, attributeFilter, pageSize])
```

- [ ] **Step 3: Reset page index when switching filter mode**

Wrap `setAttributeFilter` to also reset the page:

In `src/properties.tsx`, update the handler (already being passed as `onAttributeFilterChange`):

```tsx
const handleAttributeFilterChange = useCallback((value: "all" | "selected") => {
    setAttributeFilter(value)
    setPageIndex(0)
}, [])
```

Pass `handleAttributeFilterChange` as `onAttributeFilterChange` prop.

- [ ] **Step 4: Run tests and format**

Run: `npm test -- --run`
Run: `npm run format`
Expected: all tests pass.

- [ ] **Step 5: Manual testing checklist**

1. Open a GeoJSON source properties window
2. Select features on the map (single click, shift-click, rect-select)
3. Switch to "Selected" — table should show only the selected features
4. Switch back to "All" — table should show all features
5. Change page size — pagination should update correctly
6. Select features, then clear selection — "Selected" tab should show empty table
7. Change sorting while in "Selected" mode — should re-fetch correctly

- [ ] **Step 6: Commit**

```bash
git add src/properties.tsx src/store/listeners/selection-changed.ts
git commit -m "Fix Selected filter in properties window"
```
