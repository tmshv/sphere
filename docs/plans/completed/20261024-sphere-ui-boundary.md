# Sphere UI Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@sphere/ui` the only package that imports Mantine, so phase 2 can rebuild its internals on Base UI without touching the app.

**Architecture:** Add small Sphere-owned components and hooks to `@sphere/ui`, implemented on Mantine 5 for now (layout components are plain `div`s). Move the app's 35 Mantine-importing files onto them one group at a time, each group behind characterization tests. Finish by moving Mantine into `@sphere/ui` dependencies and adding a lint rule that forbids Mantine imports in the app.

**Tech Stack:** React 18, TypeScript, Mantine 5.10 (`@mantine/core`, `hooks`, `spotlight`), Vitest + Testing Library + happy-dom, Biome 2.4, Vite CSS Modules.

**Spec:** `docs/specs/20261024-sphere-ui-boundary.md`

**Issue:** [#268](https://github.com/tmshv/sphere/issues/268), supersedes [#72](https://github.com/tmshv/sphere/issues/72). Branch: `issue-268`.

## Global Constraints

- Code style: double quotes, no semicolons, 4-space indentation, trailing commas in multiline structures, Unix line endings.
- React components are function declarations: `export function Button({ variant = "primary", children }: ButtonProps) {}`. `memo`/`forwardRef` wrap a named function. No `FC`. Destructured react imports (`import { type ReactNode } from "react"`).
- Single-param arrow functions take no parentheses: `value => …`.
- Forbidden, without exception: non-null assertions (`!`), untyped `as` casts, `any`, magic numbers and strings, nested ternaries beyond one level, `console.log`, lint-suppression comments, out-of-bounds index access.
- New `@sphere/ui` props follow the spec's "Design rules": no Mantine prop names or types, no `size` on form controls, values (not events) in change handlers.
- Tests query by role, label and text only — never Mantine class names or `data-*` attributes — so they survive phase 2.
- Every app file changed without an existing test gets a characterization test first, passing on the Mantine version, then stays green after the swap. Exceptions: `App/index.tsx`, `SphereMap/Draw.tsx`, `properties.tsx`.
- Inside `packages/ui`, Mantine and `createStyles` are allowed in phase 1.
- Run `npm run format` after every code modification.
- No `crates/` file is touched; no Rust crate bump. `@sphere/ui` and `@sphere/utils` stay at `0.0.0`.
- Commit messages are a single line, imperative mood, under ~72 characters.

## Review Focus

- A `Select` whose `value` is no longer among `options` (layer's source was deleted) must render empty, not throw. Test in Task 5.
- Clicking a disabled `Button`, `IconButton`, `StatusbarButton` or `ContextMenuItem` must not call its handler. Tests in Tasks 3, 8, 9.
- Submitting the URL dialog with an empty field must dispatch nothing and keep the dialog open; pressing Enter in the field must submit. Test in Task 4.
- A rejected async command (copy selection fails) must be logged, not left as an unhandled rejection. Test in Task 10.
- In dark theme, `useAccentColor` must return the dark shade, or the Sources outline icon goes too dark. Test in Task 10.

## File Structure

**Created in `packages/ui/src/`** (each with `index.tsx` + `index.test.tsx`, exported from `src/index.ts`):

| Directory          | Exports                                         |
| ------------------ | ----------------------------------------------- |
| `Layout/`          | `Stack`, `Row`, `Gap`, `GAP_PX` (`gap.ts`)      |
| `Text/`            | `Text`, `Heading`                               |
| `Surface/`         | `Surface`                                       |
| `Spinner/`         | `Spinner`                                       |
| `Button/`          | `Button`, `IconButton`                          |
| `TextField/`       | `TextField`                                     |
| `Dialog/`          | `Dialog`                                        |
| `Select/`          | `Select`, `SelectOptions`, `SegmentedControl`   |
| `SliderField/`     | `SliderField`                                   |
| `ColorField/`      | `ColorField`                                    |
| `Tabs/`            | `Tabs`, `TabItem`                               |
| `CommandPalette/`  | `CommandPalette`, `Command`                     |
| `hooks/`           | `useHotkeys`, `HotkeyBinding`, `useAccentColor` |

**Modified in `packages/ui/src/`:** `ActionBar/`, `Statusbar/` (adds `StatusbarButton.tsx`, `StatusbarBadge.tsx`; renames `Select.tsx` → `StatusbarSelect.tsx`), `ContextMenu/` (adds `ContextMenuItem`, `ContextMenuLabel`), `index.ts`, `package.json`.

**Created in `apps/sphere/`:** `biome.json`, `src/lib/fire-and-log.ts`, `src/lib/photo-icon-layout.ts`, `src/properties.module.css`, `src/components/PhotoLayer/Badge.module.css`, plus characterization tests named in each task.

---

### Task 1: Convert `@sphere/ui` components to function declarations

**Files:**
- Modify: every component in `packages/ui/src` declared as `const X: React.FC<P> = (…) => …` (ActionBar, AppLayout, AttributeList parts, ContextMenu, ImageMarker, InfoRow, Outline parts, Overlay, PanelBody, PropertiesTable, BarChart, PropertiesViewer, CopyButton, SectionStack, Sidebar, Statusbar, ThemeProvider, Toolbar)
- Test (ui, new): `ImageMarker/index.test.tsx`, `PropertiesTable/{index,BarChart}.test.tsx`, `PropertiesViewer/index.test.tsx`, `Statusbar/index.test.tsx`, `ThemeProvider/index.test.tsx`, `Toolbar/index.test.tsx`

- [x] **Step 1: Characterization tests** for the seven untested files, passing on the arrow version.
- [x] **Step 2: Convert** each component to `export function X({ … }: P) {}`; `ImageMarker` becomes `memo(function ImageMarker(…))` and drops its `displayName`; drop the now-unused `FC` imports.
- [x] **Step 3: Verify.** `npm run typecheck && npm run lint && npm test`: PASS. `rg 'FC<' packages/ui/src` finds only `ActionBarItem.icon`'s prop type.
- [x] **Step 4: Commit.** `git commit -m "Convert @sphere/ui components to function declarations"`

### Task 2: Layout and text components

**Files:**
- Create: `packages/ui/src/Layout/{gap.ts,Stack.tsx,Row.tsx,index.ts,index.test.tsx}`, `packages/ui/src/Text/`, `packages/ui/src/Surface/`, `packages/ui/src/Spinner/`
- Modify: `packages/ui/src/index.ts`
- Modify (app): `components/SourcePanel/{GpxSourcePanel,VectorTilesSourcePanel,ShapefileSourcePanel,KmlSourcePanel,CsvSourcePanel,GeojsonSourcePanel}.tsx`, `components/SourcePanel/parts/{PanelSection,GeometryCounts,TileJsonSection}.tsx`, `components/PropertiesPopup/index.tsx`, `components/WorkingIndicator/index.tsx`, `components/App/index.tsx` (`Center` only), `properties.tsx`, the `Flex` in `components/SourcePanel/index.tsx` and `components/LayerPanel/index.tsx`
- Test (app, new): `GeojsonSourcePanel.test.tsx`, `GpxSourcePanel.test.tsx`, `ShapefileSourcePanel.test.tsx`, `CsvSourcePanel.test.tsx`, `VectorTilesSourcePanel.test.tsx`, `parts/GeometryCounts.test.tsx`, `parts/TileJsonSection.test.tsx`, `WorkingIndicator/index.test.tsx`

**Interfaces:**
- Produces: `type Gap = "xxs" | "xs" | "sm" | "md"`; `GAP_PX: Record<Gap, number>`; `Stack`, `Row`, `Text`, `Heading`, `Surface`, `Spinner` with the props in the spec.

- [x] **Step 1: Write characterization tests for the eight untested app files.** Each renders the component with a minimal fixture (reuse fixtures from `KmlSourcePanel.test.tsx` / `PanelSection.test.tsx`) and asserts every visible string it renders: section titles, counts, the warning text when its condition holds. `WorkingIndicator` asserts nothing renders when idle and a busy indicator renders when working.
- [x] **Step 2: Run them on the Mantine version.** Run: `npm test -w @sphere/app -- src/components/SourcePanel src/components/WorkingIndicator`. Expected: PASS.
- [x] **Step 3: Write failing `@sphere/ui` tests.**

```tsx
it("maps gap tokens to today's pixels", () => {
    expect(GAP_PX).toEqual({ xxs: 2, xs: 4, sm: 12, md: 16 })
})
it("Stack and Row render children and pass className and style through", …)
it("Text renders children", …)
it("Heading renders a level-3 heading", () => {
    render(<Heading>Properties</Heading>)
    expect(screen.getByRole("heading", { level: 3, name: "Properties" })).toBeInTheDocument()
})
it("Spinner is announced as status with default label", () => {
    render(<Spinner />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
})
```

- [x] **Step 4: Run them to verify they fail.** Run: `npm test -w @sphere/ui -- src/Layout src/Text src/Spinner`. Expected: FAIL, modules not found.
- [x] **Step 5: Implement.** `Stack`/`Row`/`Surface` are plain `div`s with inline flex styles from `GAP_PX`; `Surface` padding is `GAP_PX.sm`. `Text` wraps Mantine `Text size="xs"` (tones `dimmed` → `color="dimmed"`, `warning` → `color="orange"`; weights 500/600). `Heading` wraps `Title order={3}`. `Spinner` wraps `Loader size="xs"` inside an element with `role="status"` and `aria-label`.
- [x] **Step 6: Run ui tests.** Expected: PASS.
- [x] **Step 7: Swap the app files listed above.** `spacing={2}` → `gap="xxs"`, `spacing={4}` → `gap="xs"`. `Flex direction="column" gap="md" align="stretch" mb="sm"` → `Stack gap="md" align="stretch" style={FORM_STYLE}` with a named `FORM_STYLE` constant. `Center` → `div` with flex centring merged into `WORKING_INDICATOR_STYLE`. `properties.tsx`: `Box` + `createStyles` → `div` + `properties.module.css`.
- [x] **Step 8: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS, and `rg '@mantine' <each file swapped>` finds nothing (except files that still import `TextInput`/`Select`, which later tasks finish).
- [x] **Step 9: Commit.** `git commit -m "Add layout and text components to @sphere/ui"`

### Task 3: Button and IconButton

**Files:**
- Create: `packages/ui/src/Button/{Button.tsx,IconButton.tsx,index.ts,index.test.tsx}`
- Modify: `packages/ui/src/ActionBar/{index.tsx,index.test.tsx}` (accessible names only)
- Modify (app): `components/LayersOutline/index.tsx`, `components/SphereMap/MapToolbar.tsx`, `components/SphereMap/Draw.tsx`
- Test (app, new): `LayersOutline/index.test.tsx`, `SphereMap/MapToolbar.test.tsx`

**Interfaces:**
- Produces: `Button`, `IconButton` with spec props. `IconButton` sets `aria-label` and `title` from `label`, `aria-pressed` from `active` when `active` is defined. `ActionBar` buttons are named by `item.label`, which Task 4's `SourcesTab` test needs.

- [x] **Step 1: Characterization tests.** `LayersOutline`: clicking a layer's visibility button dispatches `actions.layer.setVisible({ id, value: !visible })` for that layer. `MapToolbar`: clicking each tool button (found by its existing `title`: `"Navigation"`, `"Select"`, `"Info"`) dispatches `actions.app.setMapTool(tool)`.
- [x] **Step 2: Run them on the Mantine version.** Expected: PASS.
- [x] **Step 3: Write failing ui tests.**

```tsx
it("Button defaults to type=button and calls onClick", …)
it("Button type=submit submits its form", …)
it("disabled Button does not call onClick", …)
it("IconButton is named by label and exposes it as title", () => {
    render(<IconButton icon={<svg />} label="Reset north" onClick={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Reset north" })).toHaveAttribute("title", "Reset north")
})
it("IconButton active sets aria-pressed", …)
it("disabled IconButton does not call onClick", …)
it("ActionBar names each button by its item label", …)  // in ActionBar/index.test.tsx
```

- [x] **Step 4: Run to verify failure,** then **implement** on Mantine `Button` (`secondary` → `color="gray"`, `size="xs"`) and `ActionIcon` (`size="sm"` → Mantine `xs`, `md` → `md`; `appearance="solid"` + `active` → `variant="filled"`, otherwise `subtle`). In `ActionBar`, add `aria-label={label}` to each `ActionIcon`. That is the only `ActionBar` change in this task; Task 9 removes the dead `Tooltip`.
- [x] **Step 5: Run ui tests.** Expected: PASS.
- [x] **Step 6: Swap the three app files.** `MapToolbar` passes `appearance="solid"` and `active={mapTool === tool}`; its `title` becomes `label`; its `Group` (spacing 4) becomes `Row gap="xs"`. Extend the `MapToolbar` test: the active tool has `aria-pressed="true"`. `LayersOutline` gives the visibility button a label (`"Hide layer"` / `"Show layer"`) and drops `radius="sm"` (Mantine's default) and `h={30}` (spec "Behaviour changes"). `Draw`: Cancel is `variant="secondary"`; the `Flex gap="xs"` around Cancel/Done becomes `Row gap="xs"`.
- [x] **Step 7: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS.
- [x] **Step 8: Commit.** `git commit -m "Add Button and IconButton to @sphere/ui"`

### Task 4: TextField and Dialog

**Files:**
- Create: `packages/ui/src/TextField/`, `packages/ui/src/Dialog/`
- Modify (app): `components/LeftSidebar/SourcesTab.tsx`, `components/LayerPanel/LayerFilter.tsx`, `components/SourcePanel/index.tsx`, `components/LayerPanel/index.tsx` (name fields)
- Test (app): extend `LeftSidebar/SourcesTab` tests; new `LayerPanel/LayerFilter.test.tsx`

**Interfaces:**
- Consumes: `Button`, `IconButton`, `Row` (Tasks 2–3).
- Produces: `TextField`, `Dialog` with spec props.

- [x] **Step 1: Characterization tests.** `LayerFilter`: typing a filter shows the text; the clear button appears only when text is present; clicking it empties the field. `SourcesTab`: clicking the ActionBar button named by its URL item's label (named since Task 3) opens a dialog titled "Input URL"; typing a URL and clicking Submit dispatches `actions.source.addFromUrl` with that URL and closes the dialog. Today an empty submit also dispatches; don't characterize that, since Step 6 changes it on purpose (spec "Behaviour changes").
- [x] **Step 2: Run them on the Mantine version.** Expected: PASS.
- [x] **Step 3: Write failing ui tests.**

```tsx
it("TextField is labelled and reports the new value as a string", …)
it("TextField shows error text and marks the input invalid", …)  // aria-invalid="true"
it("TextField code disables spellcheck, autocorrect and autocapitalize", …)
it("TextField required marks the input required", …)
it("Dialog renders title, children and footer only when opened", …)
it("Dialog calls onClose on Escape", …)
```

- [x] **Step 4: Run to verify failure,** then **implement** on Mantine `TextInput size="xs"` (`required` → `withAsterisk` + `required`) and `Modal centered size="md"` (footer in a right-aligned `Row` with `gap="xs"`, top margin `GAP_PX.md`).
- [x] **Step 5: Run ui tests.** Expected: PASS.
- [x] **Step 6: Swap the app files.** `SourcesTab`: replace `useForm` with `useState<string>`; the form's `onSubmit` calls `event.preventDefault()`, returns early on an empty trimmed URL, otherwise dispatches and closes. The Submit button goes in `footer`. Add the Review Focus tests: empty submit dispatches nothing and the dialog stays open; Enter in the URL field submits. `LayerFilter` uses `code` and an `IconButton` labelled `"Clear filter"`. Name fields use `onChange={value => …}`.
- [x] **Step 7: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS. `rg '@mantine/form' apps` finds nothing.
- [x] **Step 8: Commit.** `git commit -m "Add TextField and Dialog to @sphere/ui"`

### Task 5: Select and SegmentedControl

**Files:**
- Create: `packages/ui/src/Select/{Select.tsx,SegmentedControl.tsx,index.ts,index.test.tsx}`
- Rename: `packages/ui/src/Statusbar/Select.tsx` → `StatusbarSelect.tsx` and `Select.test.tsx` → `StatusbarSelect.test.tsx` (export `StatusbarSelect`, `StatusbarSelectProps`; keep `SelectOption` exported from `Select/`)
- Modify: `packages/ui/src/PropertiesTable/index.tsx` (imports and uses the statusbar `Select`)
- Modify (app): `components/SourcePanel/CsvGeometryConfig.tsx` (selects, plus its `Stack`/`Group`/`Text`), `components/LayerPanel/index.tsx` (three selects)

**Interfaces:**
- Produces: `type SelectOptions = ReadonlyArray<string | SelectOption>`; `Select`, `SegmentedControl` with spec props.

- [x] **Step 1: Write failing ui tests.**

```tsx
it("Select is labelled and shows the selected option's label", …)
it("Select reports the picked value", …)
it("Select accepts plain string options", …)
it("Select renders empty when value is not among options", () => {
    render(<Select label="Source" value="gone" options={[{ value: "a", label: "A" }]} onChange={vi.fn()} />)
    expect(screen.getByLabelText("Source")).toBeInTheDocument()
    expect(screen.queryByText("A")).not.toBeInTheDocument()
    expect(screen.queryByText("gone")).not.toBeInTheDocument()
})
it("SegmentedControl is a labelled group and reports the picked value", …)
```

- [x] **Step 2: Run to verify failure,** then **implement** on Mantine `Select size="xs"` and `SegmentedControl size="xs"`. Move `SelectOption` into `Select/` and re-export it; update `Statusbar` and `PropertiesTable` imports to `StatusbarSelect`.
- [x] **Step 3: Run ui tests.** Expected: PASS, including the renamed `StatusbarSelect.test.tsx` and `PropertiesTable/index.test.tsx`.
- [x] **Step 4: Swap the app files.** In `CsvGeometryConfig`: `Stack spacing="xs"` → `Stack gap="xs"`, `Group grow spacing="xs" align="flex-start" noWrap` → `Row grow gap="xs" align="start"`, `Text size="xs" color="orange"` → `Text tone="warning"`. Their existing tests (`CsvGeometryConfig.test.tsx`, `LayerPanel/index.test.tsx`) must stay green unchanged, except for queries that relied on Mantine internals; rewrite those by label.
- [x] **Step 5: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS.
- [x] **Step 6: Commit.** `git commit -m "Add Select and SegmentedControl to @sphere/ui"`

### Task 6: SliderField and ColorField; layer style controls

**Files:**
- Create: `packages/ui/src/SliderField/`, `packages/ui/src/ColorField/`, `apps/sphere/src/lib/photo-icon-layout.ts` (+ test)
- Modify (app): `components/LayerPanel/{PointControls,LineControls,PolygonControls,HeatmapControls,ExtrusionControls,PhotoControls}.tsx`
- Test (app, new): one test file per controls component

**Interfaces:**
- Consumes: `Select` (Task 5).
- Produces: `SliderField`, `ColorField`; `isPhotoIconLayout(value: unknown): value is PhotoIconLayout`.

- [x] **Step 1: Characterization tests** for the six controls components with a store that records dispatched actions. Each asserts its labels render (`"Color"` with the hex badge, `"Radius"`, `"Height field"`, …) and that changing a slider with the keyboard (`ArrowRight` on the `slider` role) dispatches the matching action with the new value.
- [x] **Step 2: Run them on the Mantine version.** Expected: PASS.
- [x] **Step 3: Write failing tests.**

```tsx
it("SliderField is labelled and exposes min, max and value", …)  // aria-valuemin/max/now
it("SliderField ArrowRight reports value + step, clamped to max", …)
it("ColorField shows the label and the current hex", …)
it("isPhotoIconLayout accepts circle and square only", () => {
    expect(isPhotoIconLayout("circle")).toBe(true)
    expect(isPhotoIconLayout("square")).toBe(true)
    expect(isPhotoIconLayout("hexagon")).toBe(false)
    expect(isPhotoIconLayout(null)).toBe(false)
})
```

- [x] **Step 4: Run to verify failure,** then **implement.** `SliderField` = `Input.Wrapper size="xs"` + `Slider size="xs"` with no thumb `label` override (shows the value — spec "Behaviour changes"). `ColorField` = `Input.Wrapper` whose label contains the hex in `Badge size="xs" radius="sm"`, wrapping `ColorPicker format="hex" size="xs"` with today's styles (full width, saturation height 130, slider top margin `theme.spacing.sm`) as named constants.
- [x] **Step 5: Run tests.** Expected: PASS.
- [x] **Step 6: Swap the six files.** `PhotoControls` narrows the layout value with `isPhotoIconLayout` before dispatching.
- [x] **Step 7: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS. `rg '@mantine' apps/sphere/src/components/LayerPanel` finds nothing.
- [x] **Step 8: Commit.** `git commit -m "Add SliderField and ColorField to @sphere/ui"`

### Task 7: Tabs

**Files:**
- Create: `packages/ui/src/Tabs/`
- Modify (app): `components/LeftSidebar/index.tsx`, `components/LeftSidebar/index.test.tsx`

**Interfaces:**
- Produces: `Tabs`, `TabItem` with spec props.

- [x] **Step 1: Write failing ui tests.**

```tsx
it("renders a tab per item and only the active item's content", …)
it("clicking a tab reports its value", …)
it("disabled tab is not selectable", …)
it("switching tabs unmounts the previous content", …)
// Carried over from LeftSidebar's "StyledTabs" tests, which Step 4 deletes:
it("fills the sidebar height without overflowing it", …)  // root: flex column, height 100%, min-height 0, overflow hidden
it("gives the panel every pixel the tab list leaves over, and no more", …)  // panel: flex column, min-height 0, overflow hidden, flex 1 1 0
it("keeps panel children at full height unless they opt into flexing", …)  // panel child: flex-shrink 0
it("keeps the tab list at full height", …)  // tablist: flex-shrink 0
```

- [x] **Step 2: Run to verify failure,** then **implement** on Mantine `Tabs unstyled keepMounted={false}`, moving the `StyledTabs` styles from `LeftSidebar` unchanged. The four layout tests use `getComputedStyle` as the current `LeftSidebar/index.test.tsx` does.
- [x] **Step 3: Run ui tests.** Expected: PASS.
- [x] **Step 4: Swap `LeftSidebar`.** Items: sources, layers, map-styles (disabled, `Surface` placeholder). Drop the unreachable `settings` panel. Delete `StyledTabs`. Rewrite `index.test.tsx` against `LeftSidebar`: the active tab from the store is selected, clicking "Layers" dispatches `setActiveSidebarTab("layers")`.
- [x] **Step 5: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS.
- [x] **Step 6: Commit.** `git commit -m "Add Tabs to @sphere/ui and use it in the sidebar"`

### Task 8: Context menu items

**Files:**
- Modify: `packages/ui/src/ContextMenu/{index.tsx,index.test.tsx}`
- Modify (app): `components/MapContextMenu/{index.tsx,index.test.tsx}`

**Interfaces:**
- Produces: `ContextMenuItem`, `ContextMenuLabel` with spec props.

- [x] **Step 1: Write failing ui tests.**

```tsx
it("ContextMenuItem renders as a menuitem and calls onClick", …)
it("disabled ContextMenuItem does not call onClick", …)
it("ContextMenuItem shows its shortcut", …)
it("ContextMenuLabel renders its text", …)
```

- [x] **Step 2: Run to verify failure,** then **implement** on `Menu.Item` (`shortcut` → `rightSection` dimmed `Text`) and `Menu.Label`.
- [x] **Step 3: Swap `MapContextMenu`.** "Copy location" calls `writeText(copyLocationValue(coord))` from `@tauri-apps/plugin-clipboard-manager`, logging failures with `logger.error`. `copyLocationValue` is the existing prop (`App` builds `lng=… lat=…`), not a new helper. The Search item stays `disabled` and uses `shortcut="⌘K"` from a named constant. Extend its test: "Copy location" calls the mocked `writeText` with the string the `copyLocationValue` prop returns; Search is disabled.
- [x] **Step 4: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS.
- [x] **Step 5: Commit.** `git commit -m "Add context menu items to @sphere/ui"`

### Task 9: Statusbar parts and leaked ActionBar/Statusbar types

**Files:**
- Create: `packages/ui/src/Statusbar/{StatusbarButton.tsx,StatusbarBadge.tsx}` (+ tests in `Statusbar/index.test.tsx`)
- Modify: `packages/ui/src/Statusbar/index.tsx`, `packages/ui/src/ActionBar/{index.tsx,index.test.tsx}`
- Modify (app): `components/MapStatusbar/index.tsx`, `components/SourcePanel/index.tsx`, `components/LayerPanel/index.tsx`, `components/LeftSidebar/{LayersTab,SourcesTab}.tsx`
- Test (app, new): `MapStatusbar/index.test.tsx` (mock `react-map-gl/maplibre` `useMap` → `{}`)

**Interfaces:**
- Produces: `StatusbarButton`, `StatusbarBadge` with spec props; `ActionBarProps = { items; onClick; padded?: boolean }`; `StatusbarProps = { children }`.

- [x] **Step 1: Characterization test for `MapStatusbar`** on the Mantine version: renders the app version, the sources count and the selection count from the store.
- [x] **Step 2: Write failing ui tests.**

```tsx
it("StatusbarButton is named by label and titled, active sets aria-pressed", …)
it("StatusbarButton activeLook defaults to accent", …)  // assert via aria-pressed only; the look itself is checked by hand
it("disabled StatusbarButton does not call onClick", …)
it("StatusbarBadge renders children and title", …)
it("ActionBar renders a spacer for null items and one named button per item", …)  // existing tests drop tooltipPosition="bottom"
```

- [x] **Step 3: Run to verify failure,** then **implement.** Move `MapStatusbar`'s `createStyles` (`icon`, `active`, `widget`, `error`, `fix0`, `fix`) and its nested `MantineProvider` `ActionIcon` defaults into the two parts. `activeLook="accent"` → `color="yellow"`; `activeLook="fill"` → the `active` class (gray[8] background). `width` `short` = 90, `long` = 101 as named constants. `ActionBar`: drop `MantineStyleSystemProps`, `tooltipPosition` and the always-`disabled` `Tooltip`; add `padded` → horizontal padding `GAP_PX.sm`. `Statusbar`: drop `color`.
- [x] **Step 4: Run ui tests.** Expected: PASS.
- [x] **Step 5: Swap the app files.** `MapStatusbar` labels: `"Toggle sidebar"` (`activeLook="fill"`, `active={sidebar}`), `"Navigation"`, `"Select"`, `"Info"`, `"Print viewport"`, `"Reset north"`, `"Satellite"`, `"Terrain"`, `"Globe"` (`active={isGlobe}`). The `s` spacer class (`flex: 1`) becomes a `div` with a named `SPACER_STYLE`. Extend its test: clicking `"Select"` dispatches `actions.app.setMapTool("select")`; the active tool has `aria-pressed="true"`; Satellite and Terrain are disabled. `ActionBar` callers drop `tooltipPosition`; `pl`/`pr` become `padded`.
- [x] **Step 6: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS. `rg 'Mantine' packages/ui/src/ActionBar packages/ui/src/Statusbar/index.tsx` finds no exported type.
- [x] **Step 7: Commit.** `git commit -m "Move statusbar styling into @sphere/ui and drop leaked types"`

### Task 10: CommandPalette and hooks

**Files:**
- Create: `packages/ui/src/CommandPalette/`, `packages/ui/src/hooks/{useHotkeys.ts,useAccentColor.ts,index.ts,index.test.tsx}`, `apps/sphere/src/lib/fire-and-log.ts` (+ test)
- Modify (app): `components/Spotlight/index.tsx`, `components/App/index.tsx`, `components/SourcesOutline/index.tsx`
- Test (app, new): `SourcesOutline/index.test.tsx`, `Spotlight/index.test.tsx`

**Interfaces:**
- Produces: `CommandPalette`, `Command`, `useHotkeys`, `HotkeyBinding`, `useAccentColor` with spec signatures; `fireAndLog(task: () => Promise<unknown>, message: string): () => void`.

- [x] **Step 1: Characterization tests.** `SourcesOutline`: renders one item per source with its name; clicking an item dispatches `actions.source.select(id)`. `Spotlight`: pressing its shortcut (`"mod + p"`) opens the palette and lists command titles; typing filters them; choosing "Toggle Zen" dispatches `actions.app.toggleZenMode()`; choosing "Copy selection as GeoJSON" calls the mocked `copySelectionAsGeojson`. Run both on the Mantine version: PASS.
- [x] **Step 2: Write failing tests.**

```tsx
it("CommandPalette opens on its shortcut and lists command titles", …)
it("CommandPalette filters by typed text and shows emptyMessage", …)
it("CommandPalette runs onTrigger of the chosen command", …)
it("useHotkeys calls the handler for mod+V", …)
it("useAccentColor returns the light shade in light theme and the dark shade in dark theme", …)  // wrap in ThemeProvider dark={false|true}
it("fireAndLog logs a rejected task", async () => {
    // mock @/logger; fireAndLog(() => Promise.reject(new Error("x")), "Copy failed")()
    // await expect.poll(() => logger.error).toHaveBeenCalledWith("Copy failed: %s", expect.any(Error))
})
```

- [x] **Step 3: Run to verify failure,** then **implement.** `CommandPalette` wraps `SpotlightProvider` (`searchIcon` = tabler `IconSearch size={18}`, mapping `Command` to Spotlight actions by `id`). `useHotkeys` wraps `@mantine/hooks`. `useAccentColor` reads `theme.colors.blue[colorScheme === "dark" ? 5 : 7]` with named shade constants.
- [x] **Step 4: Run tests.** Expected: PASS.
- [x] **Step 5: Swap the app files.** `Spotlight` builds `commands` with ids and passes `shortcut="mod + p"` unchanged; the five async commands (Copy viewport, Reset rotation, Toggle Show Tile Boundaries, Copy selection as GeoJSON, Copy selection as WKT) use `fireAndLog`. Its characterization test stays green. `App` imports `useHotkeys` from `@sphere/ui`. `SourcesOutline` uses `useAccentColor()`.
- [x] **Step 6: Verify.** Run: `npm run typecheck && npm test`. Expected: PASS.
- [x] **Step 7: Commit.** `git commit -m "Add CommandPalette and hooks to @sphere/ui"`

### Task 11: Close the boundary

**Files:**
- Create: `apps/sphere/biome.json`, `apps/sphere/src/components/PhotoLayer/Badge.module.css`, `PhotoLayer/Badge.test.tsx`
- Modify: `apps/sphere/src/components/PhotoLayer/Badge.tsx`, `apps/sphere/src/test-utils.tsx`, `apps/sphere/package.json`, `packages/ui/package.json`, `package-lock.json`, `AGENTS.md`

- [x] **Step 1: Characterization test for `PhotoLayer/Badge`:** renders children. Run it on the `createStyles` version: PASS.
- [x] **Step 2: Convert `Badge`** to `Badge.module.css` with the same values (white background, black text, radius 50, font 12, min-width 20, padding `0 5px`, `text-align: center`, shadow `0 0 3px rgba(0, 0, 20, 0.1)`). Leave out the invalid `transform: "translate(50 %, -50 %)"`, which browsers ignore today (spec "App-side changes"). Run its test: PASS.
- [x] **Step 3: Switch `test-utils.tsx`** to `ThemeProvider dark={false}` from `@sphere/ui`. Run: `npm test -w @sphere/app`. Expected: PASS.
- [x] **Step 4: Check nothing is left.** Run: `rg -l '@mantine|@emotion' apps/sphere/src`. Expected: no output.
- [x] **Step 5: Move dependencies.** In `packages/ui/package.json`, move `@mantine/core`, `@mantine/hooks`, `@emotion/react` from `peerDependencies` to `dependencies` and add `@mantine/spotlight` (all `^5.10.5` / `^11.14.0`). Run `npm uninstall @mantine/core @mantine/hooks @mantine/form @mantine/spotlight @emotion/react -w @sphere/app`, then `npm install`. Expected: `@mantine/form` is gone from `package-lock.json`.
- [x] **Step 6: Add the lint rule.** `apps/sphere/biome.json`, shaped like `packages/ui/biome.json` (`"root": false`, `extends`, `files.includes`):

```json
"noRestrictedImports": {
    "level": "error",
    "options": {
        "patterns": [
            {
                "group": ["@mantine/*", "@emotion/*"],
                "message": "The app must not import Mantine. Use components from @sphere/ui."
            }
        ]
    }
}
```

- [x] **Step 7: Prove the rule bites.** Temporarily add `import { Box } from "@mantine/core"` to any app file and run `npm run lint -w @sphere/app`. Expected: FAIL with the message above. Remove the import; run again. Expected: PASS.
- [x] **Step 8: Update `AGENTS.md`.** In "Frontend Layering": the app must not import `@mantine/*` or `@emotion/*`; all UI building blocks come from `@sphere/ui`; enforced by `apps/sphere/biome.json`. Fix the stale "React and Mantine are peer deps" line for `@sphere/ui`.
- [x] **Step 9: Full verification.** Run: `npm run typecheck && npm run lint && npm test && npm run build`. Expected: all PASS.
- [ ] **Step 10: Manual check in the app** (`npm run tauri dev`), light and dark theme: sidebar tabs; source panels for GeoJSON, CSV (geometry config), KML; layer panel for point, line, polygon, heatmap, extrusion and photo layers; filter field and clear button; add-from-URL dialog; map context menu; statusbar buttons and badges; map toolbar on the Sources tab; draw mode Done/Cancel; command palette (`mod+P`); properties window. Note any visual difference in the PR.
- [x] **Step 11: Commit.** `git commit -m "Forbid Mantine imports in the app"`
- [ ] **Step 12: After merge,** move this plan to `docs/plans/completed/`.
