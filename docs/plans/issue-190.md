# No Lint Warnings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote every Biome lint rule from `warn` to `error` by fixing all 94 warnings, one rule at a time.

**Architecture:** Each task promotes one rule (or batch of zero-violation rules) from `warn` → `error` in `biome.json`, fixes all violations, and verifies with `npm run lint`. Work proceeds from easiest (0 fixes) to hardest (80 fixes).

**Tech Stack:** Biome linter, TypeScript, React

---

### Task 1: Promote zero-violation rules to error

These rules currently have zero warnings in the codebase.

**Files:**
- Modify: `biome.json`

- [x] **Step 1: Change four rules from warn to error**

In `biome.json`, change these rules:
```json
"noConsole": "warn" → "noConsole": "error"
"noShadowRestrictedNames": "warn" → "noShadowRestrictedNames": "error"
"noAccumulatingSpread": "warn" → "noAccumulatingSpread": "error" (in performance)
"useButtonType": "warn" → "useButtonType": "error" (in a11y)
```

- [x] **Step 2: Verify**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg 'noConsole|noShadowRestrictedNames|noAccumulatingSpread|useButtonType'`
Expected: no output (zero violations)

- [x] **Step 3: Commit**

```bash
git add biome.json
git commit -m "lint: promote noConsole, noShadowRestrictedNames, noAccumulatingSpread, useButtonType to error"
```

---

### Task 2: noNonNullAssertion (1 fix)

**Files:**
- Modify: `biome.json`
- Modify: `src/hooks/useFeatureProperties.test.ts:23`

- [x] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noNonNullAssertion": "warn" → "noNonNullAssertion": "error"
```

- [x] **Step 2: Run lint to see the error**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noNonNullAssertion`
Expected: 1 error at `src/hooks/useFeatureProperties.test.ts:23`

- [x] **Step 3: Fix the violation**

In `src/hooks/useFeatureProperties.test.ts`, line 23:
```ts
// Before:
handlers.get(event)!.push({ fn, unsubscribe: unsub })

// After:
const list = handlers.get(event)
if (list) list.push({ fn, unsubscribe: unsub })
```

- [x] **Step 4: Run tests and lint**

Run: `npm test -- --run src/hooks/useFeatureProperties.test.ts && npm run lint`
Expected: tests pass, no lint errors for this rule

- [x] **Step 5: Commit**

```bash
git add biome.json src/hooks/useFeatureProperties.test.ts
git commit -m "lint: promote noNonNullAssertion to error, fix violation in useFeatureProperties test"
```

---

### Task 3: noUnusedVariables (1 fix)

**Files:**
- Modify: `biome.json`
- Modify: `src/lib/sphere-protocol.ts:5`

- [x] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noUnusedVariables": "warn" → "noUnusedVariables": "error"
```

- [x] **Step 2: Run lint to see the error**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noUnusedVariables`
Expected: 1 error at `src/lib/sphere-protocol.ts:5` — unused type `RequestType`

- [x] **Step 3: Fix the violation**

In `src/lib/sphere-protocol.ts`, delete line 5:
```ts
type RequestType = "json" | "arrayBuffer" | "string" | "image" | undefined
```

- [x] **Step 4: Run tests and lint**

Run: `npm test -- --run && npm run lint`
Expected: all pass, no lint errors for this rule

- [x] **Step 5: Commit**

```bash
git add biome.json src/lib/sphere-protocol.ts
git commit -m "lint: promote noUnusedVariables to error, remove unused RequestType"
```

---

### Task 4: noForEach (1 fix)

**Files:**
- Modify: `biome.json`
- Modify: `src/components/PhotoLayer/hooks.test.ts:37`

- [x] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noForEach": "warn" → "noForEach": "error"
```

- [x] **Step 2: Run lint to see the error**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noForEach`
Expected: 1 error at `src/components/PhotoLayer/hooks.test.ts:37`

- [x] **Step 3: Fix the violation**

In `src/components/PhotoLayer/hooks.test.ts`, line 37:
```ts
// Before:
;(handlers[event] ?? []).slice().forEach(fn => fn(undefined))

// After:
for (const fn of (handlers[event] ?? []).slice()) fn(undefined)
```

- [x] **Step 4: Run tests and lint**

Run: `npm test -- --run src/components/PhotoLayer/hooks.test.ts && npm run lint`
Expected: tests pass, no lint errors for this rule

- [x] **Step 5: Commit**

```bash
git add biome.json src/components/PhotoLayer/hooks.test.ts
git commit -m "lint: promote noForEach to error, use for-of in PhotoLayer test"
```

---

### Task 5: noSvgWithoutTitle (1 fix)

**Files:**
- Modify: `biome.json`
- Modify: `src/components/SphereMap/RectSelectOverlay.tsx:223`

- [x] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noSvgWithoutTitle": "warn" → "noSvgWithoutTitle": "error"
```

- [x] **Step 2: Run lint to see the error**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noSvgWithoutTitle`
Expected: 1 error at `src/components/SphereMap/RectSelectOverlay.tsx:223`

- [x] **Step 3: Fix the violation**

This SVG is a decorative selection rectangle overlay — it should be hidden from assistive tech. Add `aria-hidden="true"` and `role="img"` to the `<svg>` element at line 223:

```tsx
// Before:
<svg
    style={{
        position: "fixed",
        ...

// After:
<svg
    aria-hidden="true"
    role="img"
    style={{
        position: "fixed",
        ...
```

- [x] **Step 4: Run tests and lint**

Run: `npm run lint`
Expected: no lint errors for this rule

- [x] **Step 5: Commit**

```bash
git add biome.json src/components/SphereMap/RectSelectOverlay.tsx
git commit -m "lint: promote noSvgWithoutTitle to error, add aria-hidden to RectSelectOverlay SVG"
```

---

### Task 6: noUnusedImports (2 fixes)

**Files:**
- Modify: `biome.json`
- Modify: `src/main.tsx:7,15`

- [x] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noUnusedImports": "warn" → "noUnusedImports": "error"
```

- [x] **Step 2: Run lint to see the errors**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noUnusedImports`
Expected: 2 errors in `src/main.tsx` — unused `actions` (line 7) and unused `SourceType` (line 15)

- [x] **Step 3: Fix the violations**

In `src/main.tsx`:

Line 7 — remove `actions` from the import if unused:
```ts
// Before:
import { actions, store } from "@/store"
// After:
import { store } from "@/store"
```

Line 15 — remove the entire import:
```ts
// Delete:
import { SourceType } from "./types"
```

- [x] **Step 4: Run tests and lint**

Run: `npm run lint`
Expected: no lint errors for this rule

- [x] **Step 5: Commit**

```bash
git add biome.json src/main.tsx
git commit -m "lint: promote noUnusedImports to error, remove unused imports in main.tsx"
```

---

### Task 7: useExhaustiveDependencies (3 fixes)

**Files:**
- Modify: `biome.json`
- Modify: `src/components/LayerPanel/LayerFilter.tsx:23`
- Modify: `src/components/PhotoLayer/hooks.ts:73`
- Modify: `src/properties.tsx:169`

- [ ] **Step 1: Promote rule to error**

In `biome.json`:
```json
"useExhaustiveDependencies": "warn" → "useExhaustiveDependencies": "error"
```

- [ ] **Step 2: Run lint to see the errors**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg useExhaustiveDependencies`
Expected: 3 errors

- [ ] **Step 3: Fix LayerFilter.tsx**

Line 23 — `layerId` is flagged as unnecessary (outer scope value that doesn't cause re-render). But `layerId` is a prop that changes when the user selects a different layer and should reset the filter text. `filterExpression` already captures the change since it comes from a selector keyed by `layerId`. Remove `layerId`:

```ts
// Before:
}, [layerId, filterExpression])

// After:
}, [filterExpression])
```

- [ ] **Step 4: Fix PhotoLayer/hooks.ts**

Line 73 — `filter` is flagged as unnecessary. The `filter` variable comes from `useAppSelector` and is used to gate the `ok` value on line 15-27 (a `useMemo` that checks source type). But `filter` itself is not used inside the effect body — only `ok`, `layerId`, and `map` are. Remove `filter`:

```ts
// Before:
}, [ok, layerId, map, filter])

// After:
}, [ok, layerId, map])
```

- [ ] **Step 5: Fix properties.tsx**

Line 169 — `selectionData` is flagged as unnecessary. The effect uses `isSelectionActive` (derived from `selectionData`) but does not use `selectionData` directly. Remove it:

```ts
// Before:
}, [sourceId, pageIndex, sorting, filterExpression, isSelectionActive, selectionData])

// After:
}, [sourceId, pageIndex, sorting, filterExpression, isSelectionActive])
```

- [ ] **Step 6: Run tests and lint**

Run: `npm test -- --run && npm run lint`
Expected: all pass, no lint errors for this rule

- [ ] **Step 7: Commit**

```bash
git add biome.json src/components/LayerPanel/LayerFilter.tsx src/components/PhotoLayer/hooks.ts src/properties.tsx
git commit -m "lint: promote useExhaustiveDependencies to error, remove unnecessary deps"
```

---

### Task 8: noArrayIndexKey (3 fixes)

**Files:**
- Modify: `biome.json`
- Modify: `src/components/PropertiesPopup/index.tsx:37`
- Modify: `src/ui/ActionBar/index.tsx:25`
- Modify: `src/ui/PropertiesTable/BarChart.tsx:56`

- [ ] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noArrayIndexKey": "warn" → "noArrayIndexKey": "error"
```

- [ ] **Step 2: Run lint to see the errors**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noArrayIndexKey`
Expected: 3 errors

- [ ] **Step 3: Fix PropertiesPopup**

Line 37: The `props` array items are `GeoJSON.Feature["properties"]` objects with no unique ID. Use a stable stringified key:
```tsx
// Before:
{props.map((x, i) => (
    <PropertiesViewer key={i} properties={x} />
))}

// After:
{props.map((x, i) => (
    <PropertiesViewer key={`prop-${i}-${Object.keys(x ?? {}).length}`} properties={x} />
))}
```

Note: If the lint rule still fires on any use of `i` in a key, suppress with a biome-ignore comment instead since these items have no stable identity:
```tsx
{props.map((x, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: feature properties have no stable unique key
    <PropertiesViewer key={i} properties={x} />
))}
```

- [ ] **Step 4: Fix ActionBar**

Line 25: The `<Space>` separator uses `key={\`space-${i}\`}`. These are null-gap items in the `items` array with no identity. Suppress:
```tsx
// biome-ignore lint/suspicious/noArrayIndexKey: separator items have no identity
return <Space key={`space-${i}`} style={{ flex: 1 }} />
```

- [ ] **Step 5: Fix BarChart**

Line 56: Bar chart data items are numeric values with no unique ID. The chart data is static per render — index keys are fine here. Suppress:
```tsx
{data.map((d, i) => {
    const barHeight = yMax - yScale(d)
    const barX = xScale(i)
    const barY = yMax - barHeight
    // biome-ignore lint/suspicious/noArrayIndexKey: histogram bars are positional with no stable ID
    return <Bar key={i} x={barX} y={barY} width={barWidth} height={barHeight} fill={color} />
})}
```

- [ ] **Step 6: Run tests and lint**

Run: `npm run lint`
Expected: no lint errors for this rule

- [ ] **Step 7: Commit**

```bash
git add biome.json src/components/PropertiesPopup/index.tsx src/ui/ActionBar/index.tsx src/ui/PropertiesTable/BarChart.tsx
git commit -m "lint: promote noArrayIndexKey to error, suppress justified index keys"
```

---

### Task 9: noBannedTypes (3 fixes)

**Files:**
- Modify: `biome.json`
- Modify: `src/components/WorkingIndicator/index.tsx:4`
- Modify: `src/hooks/useFeatureProperties.test.ts:18,20`

- [ ] **Step 1: Promote rule to error**

In `biome.json`:
```json
"noBannedTypes": "warn" → "noBannedTypes": "error"
```

- [ ] **Step 2: Run lint to see the errors**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noBannedTypes`
Expected: 3 errors

- [ ] **Step 3: Fix WorkingIndicator**

`{}` as a type is banned. This component takes no props. Remove the type entirely:

```tsx
// Before:
export type WorkingIndicatorProps = {}

export const WorkingIndicator: React.FC<WorkingIndicatorProps> = () => {

// After (use function component style per project convention):
export function WorkingIndicator() {
```

Delete the `WorkingIndicatorProps` export entirely. Check if it's imported anywhere first:
Run: `rg WorkingIndicatorProps src/`
If not imported elsewhere, just delete it.

- [ ] **Step 4: Fix useFeatureProperties.test.ts**

Lines 18 and 20 use `Function` (banned type). Replace with explicit signatures:

```ts
// Before (line 18):
const handlers: Map<string, { fn: Function; unsubscribe: ReturnType<typeof vi.fn> }[]> = new Map()

// After:
const handlers: Map<string, { fn: (payload: object) => void; unsubscribe: ReturnType<typeof vi.fn> }[]> = new Map()

// Before (line 20):
on: vi.fn((event: string, fn: Function) => {

// After:
on: vi.fn((event: string, fn: (payload: object) => void) => {
```

- [ ] **Step 5: Run tests and lint**

Run: `npm test -- --run src/hooks/useFeatureProperties.test.ts src/components/WorkingIndicator && npm run lint`
Expected: tests pass, no lint errors for this rule

- [ ] **Step 6: Commit**

```bash
git add biome.json src/components/WorkingIndicator/index.tsx src/hooks/useFeatureProperties.test.ts
git commit -m "lint: promote noBannedTypes to error, replace {} and Function types"
```

---

### Task 10: noExplicitAny — production code (3 fixes)

Fix `any` usages in non-test files first since they are fewer and more impactful.

**Files:**
- Modify: `src/simple-xml-to-json.d.ts:2`
- Modify: `src/store/properties/index.ts:5`
- Modify: `src/types/index.ts:56`
- Modify: `src/ui/PropertiesTable/index.tsx:56,344`

- [ ] **Step 1: Fix simple-xml-to-json.d.ts**

This is a third-party module declaration. Use `unknown`:
```ts
// Before:
function convertXML<T = any>(raw: string): T

// After:
function convertXML<T = unknown>(raw: string): T
```

- [ ] **Step 2: Fix store/properties/index.ts**

```ts
// Before:
type Properties = Record<string, any>

// After:
type Properties = Record<string, unknown>
```

Check that downstream code consuming `Properties` still compiles. Run: `npx tsc --noEmit`

- [ ] **Step 3: Fix types/index.ts**

```ts
// Before:
data: Record<string, any>

// After:
data: Record<string, unknown>
```

Check that downstream code consuming `DatasetRow` still compiles. Run: `npx tsc --noEmit`

- [ ] **Step 4: Fix ui/PropertiesTable/index.tsx**

Line 56:
```ts
// Before:
export type PropertyItem = Record<string, any>

// After:
export type PropertyItem = Record<string, unknown>
```

Line 344:
```ts
// Before:
let render = (info: CellContext<PropertyItem, any>) => info.getValue()

// After:
let render = (info: CellContext<PropertyItem, unknown>) => info.getValue()
```

- [ ] **Step 5: Run tests and lint**

Run: `npx tsc --noEmit && npm test -- --run && npx biome lint src/ --max-diagnostics=200 2>&1 | rg 'noExplicitAny.*(?!\.test\.)' `
Expected: tsc passes, tests pass, no noExplicitAny in non-test files

- [ ] **Step 6: Commit**

```bash
git add src/simple-xml-to-json.d.ts src/store/properties/index.ts src/types/index.ts src/ui/PropertiesTable/index.tsx
git commit -m "lint: replace any with unknown in production code"
```

---

### Task 11: noExplicitAny — test helpers and shared patterns

Many test files follow the same patterns: `makeRootState` returning `as any`, `mockImplementation((selector: any) =>`, and `map as any` for mock objects. Fix the repeated patterns.

**Files (test helper pattern — `makeRootState ... as any`):**
- `src/store/selectors.test.ts:6,16`
- `src/store/app.test.ts:25`
- `src/store/draw.test.ts:7`
- `src/store/error.test.ts:6`
- `src/store/layer/index.test.ts:10,12`
- `src/store/map-interaction.test.ts:7`
- `src/store/tools.test.ts:7`
- `src/store/source/index.test.ts:18,148`
- `src/components/LayerPanel/index.test.ts:6,17,23`

Strategy: Replace `as any` with `as unknown as RootState` (or import the partial state pattern). For `Record<string, any>` override params, use `Record<string, unknown>`.

- [ ] **Step 1: Fix each makeRootState / makeLayer pattern**

For every file above, apply this transformation:

```ts
// Before:
const makeRootState = (overrides: Record<string, any> = {}) =>
    ({ ... }) as any

// After:
import type { RootState } from "@/store"  // add if not present
const makeRootState = (overrides: Record<string, unknown> = {}) =>
    ({ ... }) as unknown as RootState
```

For `makeLayer` patterns:
```ts
// Before:
const makeLayer = (id: string, overrides: Record<string, any> = {}) => ({
// After:
const makeLayer = (id: string, overrides: Record<string, unknown> = {}) => ({
```

For slice-specific files (`app.test.ts`, `draw.test.ts`, etc.) that do `({ app }) as any`:
```ts
// Before:
const makeRootState = (app: object) => ({ app }) as any
// After:
import type { RootState } from "@/store"
const makeRootState = (app: object) => ({ app }) as unknown as RootState
```

- [ ] **Step 2: Run tests and lint**

Run: `npm test -- --run && npx biome lint src/ --max-diagnostics=200 2>&1 | rg noExplicitAny -c`
Expected: tests pass, count drops significantly

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "lint: replace as-any with as-unknown-as-RootState in test makeRootState helpers"
```

---

### Task 12: noExplicitAny — test mock patterns (selector: any, map as any)

**Files:**
- `src/components/PhotoLayer/hooks.test.ts:44,57,65,76,90,103,114,132`
- `src/hooks/useCursor.test.ts:24,31,40`
- `src/hooks/useFeatureProperties.test.ts:17,26,37,45,59,70,156,171`
- `src/hooks/useMapNavigation.test.ts:32,38`
- `src/ui/ActionBar/index.test.tsx:14`

Strategy:
- `(selector: any) =>` in `mockImplementation` — replace with the actual selector type or `(selector: (state: RootState) => unknown) =>`
- `map as any` — create a typed mock interface or use `as unknown as MapRef` (or the specific expected type)
- `MockIcon as any` — use `as unknown as React.FC`

- [ ] **Step 1: Fix selector mock patterns**

For files using `vi.mocked(useAppSelector).mockImplementation((selector: any) =>`:
```ts
// Before:
vi.mocked(useAppSelector).mockImplementation((selector: any) =>

// After:
vi.mocked(useAppSelector).mockImplementation((selector: (state: unknown) => unknown) =>
```

- [ ] **Step 2: Fix map-as-any patterns**

For `hooks.test.ts` files using `map as any`:
```ts
// Before:
renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

// After:
renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as MapInstance }))
```

Where `MapInstance` is the type expected by `useFeatures`. Check the hook's parameter type and import accordingly.

For `useCursor.test.ts` using `{ getMap: mock.getMap } as any`:
```ts
// After:
{ getMap: mock.getMap } as unknown as MapRef
```

For `useMapNavigation.test.ts`:
```ts
// Before:
return { getMap: () => map } as any
// After:
return { getMap: () => map } as unknown as MapRef
```

- [ ] **Step 3: Fix ActionBar test**

```ts
// Before:
icon: MockIcon as any,
// After:
icon: MockIcon as unknown as ActionBarItem["icon"],
```

- [ ] **Step 4: Fix useFeatureProperties.test.ts remaining any**

Line 17: `makeMockMap(queryResult: any[] = [])` → `makeMockMap(queryResult: unknown[] = [])`
Lines 26: `(_point: any, _opts: any)` → `(_point: unknown, _opts: unknown)`
Line 37: `(state: any)` → `(state: unknown)`
Line 45: `(selector: any)` → same pattern as step 1
Lines 59,70: check context and apply appropriate type
Lines 156,171: `as any` on feature arrays → `as unknown as ReturnType<typeof useFeatureClick>`

- [ ] **Step 5: Run tests and lint**

Run: `npm test -- --run && npx biome lint src/ --max-diagnostics=200 2>&1 | rg noExplicitAny -c`
Expected: tests pass, count near zero

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "lint: replace as-any with typed mocks in test files"
```

---

### Task 13: noExplicitAny — listener test files

**Files:**
- `src/store/listeners/add-blank-layer.test.ts` (20 occurrences)
- `src/store/listeners/add-source.test.ts` (12 occurrences)
- `src/store/listeners/zoom-to.test.ts` (8 occurrences)

These files share two patterns:
1. `(s: any = state) => s` in `configureStore` reducer
2. `(a: any) => a.type === "..."` in `dispatchedActions.find()`
3. `(setSourceAction as any).payload`

- [ ] **Step 1: Fix makeStore reducer pattern**

```ts
// Before:
reducer: (s: any = state) => s,

// After:
reducer: (s: unknown = state) => s,
```

- [ ] **Step 2: Fix captureMiddleware as-any**

```ts
// Before:
.concat(captureMiddleware as any),

// After (type the middleware properly or use unknown):
.concat(captureMiddleware as unknown as Middleware),
```

Import `Middleware` from `@reduxjs/toolkit`.

- [ ] **Step 3: Fix dispatchedActions.find patterns**

All three files use `(a: any) => a.type === "..."`. Since `dispatchedActions` is `unknown[]`, use a type guard:

```ts
// Define at top of file:
function hasType(action: unknown, type: string): action is { type: string; payload: unknown } {
    return typeof action === "object" && action !== null && "type" in action && (action as { type: string }).type === type
}

// Before:
const addLayerAction = dispatchedActions.find((a: any) => a.type === "layer/addLayer")

// After:
const addLayerAction = dispatchedActions.find(a => hasType(a, "layer/addLayer"))
```

- [ ] **Step 4: Fix payload access patterns**

```ts
// Before:
expect((setTabAction as any).payload).toBe("layers")

// After:
expect((setTabAction as { payload: unknown }).payload).toBe("layers")
```

Or combine with the `hasType` guard which already narrows to `{ type: string; payload: unknown }`:
```ts
const setTabAction = dispatchedActions.find(a => hasType(a, "app/setActiveSidebarTab"))
expect(setTabAction?.payload).toBe("layers")
```

- [ ] **Step 5: Apply same patterns across all three files**

Repeat steps 1-4 for `add-source.test.ts` and `zoom-to.test.ts`.

- [ ] **Step 6: Run tests and lint**

Run: `npm test -- --run src/store/listeners/ && npx biome lint src/ --max-diagnostics=200 2>&1 | rg noExplicitAny -c`
Expected: tests pass, zero remaining

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "lint: replace as-any with typed assertions in listener tests"
```

---

### Task 14: Promote noExplicitAny to error

- [ ] **Step 1: Verify zero violations remain**

Run: `npx biome lint src/ --max-diagnostics=200 2>&1 | rg noExplicitAny`
Expected: no output

- [ ] **Step 2: Promote rule to error**

In `biome.json`:
```json
"noExplicitAny": "warn" → "noExplicitAny": "error"
```

- [ ] **Step 3: Final verification**

Run: `npm run lint && npm test -- --run`
Expected: zero warnings, zero errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add biome.json
git commit -m "lint: promote noExplicitAny to error"
```

---

### Task 15: Final cleanup

- [ ] **Step 1: Verify zero warnings remain**

Run: `npm run lint`
Expected: `Found 0 warnings.` or no diagnostic output at all

- [ ] **Step 2: Run full test suite**

Run: `npm test -- --run`
Expected: all tests pass

- [ ] **Step 3: Format**

Run: `npm run format`

- [ ] **Step 4: Final commit if format changed anything**

```bash
git add -A
git commit -m "chore: format after lint cleanup"
```
