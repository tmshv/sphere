# Base UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every `@sphere/ui` component on Base UI and CSS Modules driven by design tokens, and remove Mantine and Emotion from the repository, with no visual change.

**Architecture:** First freeze today's look as screenshot baselines (Vitest browser mode, WebKit). Then add design tokens and an own `ThemeProvider` alongside `MantineProvider`, and migrate components bottom-up (primitives → layouts → composites), each task passing the unchanged baselines. The last task removes `MantineProvider` and all Mantine/Emotion packages.

**Tech Stack:** React 18, TypeScript, `@base-ui/react` 1.9, `react-colorful` 5.8, CSS Modules (Vite), Vitest 4.1 (happy-dom for unit tests, browser mode + Playwright WebKit for visual tests), Biome 2.4.

**Spec:** `docs/specs/20261025-base-ui-migration.md`

**Issue:** [#72](https://github.com/tmshv/sphere/issues/72). Branch: `issue-72`.

## Global Constraints

- Code style: double quotes, no semicolons, 4-space indentation, trailing commas in multiline structures, Unix line endings.
- Components are `function Foo({ a }: FooProps) {}` declarations, not arrow + `FC`. Destructured react imports. Single-param arrows without parentheses.
- Forbidden, without exception: non-null assertions (`!`), untyped `as` casts, `any`, magic numbers and strings, nested ternaries beyond one level, `console.log`, lint-suppression comments, out-of-bounds index access.
- Public props of every `@sphere/ui` export stay as they are. Any app change must be named in a task.
- Colours, sizes and fonts come only from tokens (`var(--sphere-…)` in CSS Modules). Components never reference the palette directly.
- CSS for each component is ported from Mantine 5.10.5's own styles for the variants Sphere uses: `node_modules/@mantine/core/esm/<Component>/<Component>.styles.js` (and `@mantine/styles` for theme functions). Reproduce what renders, including no-op styles (spec: "Preserve effective rendering"); record each such case in `docs/plans/20261025-base-ui-migration-notes.md` for the PR description.
- Visual baselines from Tasks 1–2 are never updated to accept a real difference. A per-test tolerance for anti-aliasing is allowed with a comment saying why.
- Every task ends with `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:visual -w @sphere/ui` all passing.
- Run `npm run format` after every code modification.
- `@sphere/ui` and `@sphere/utils` stay at `0.0.0`. No `crates/` change.
- Commit messages are a single line, imperative mood, under ~72 characters.

## Review Focus

- A popup (select dropdown, menu, tooltip, dialog) opened while the app is in dark theme must render dark, though it is portalled outside the React tree. Visual cases with open popups in dark theme cover it (Tasks 1, 5, 7, 8).
- Switching theme at runtime must restyle everything without reload, including already-open popups. Test in Task 2 (`data-theme` on `<html>` changes on re-render with `dark` toggled).
- Keyboard use must keep working where Mantine provided it: arrow keys in Select, SegmentedControl, Tabs, Menu, Slider and the command palette; Escape closes dialogs, menus and the palette. Tests in Tasks 5–8.
- `mod+V` (paste GeoJSON) must not fire while typing in a text field, and `mod+P` must open the palette from anywhere. Test in Task 8.
- The context menu opened near the right or bottom window edge must stay on screen. Test in Task 8.

## File Structure

**Created in `packages/ui/`:**

| Path                                | Responsibility                                       |
| ----------------------------------- | ---------------------------------------------------- |
| `vitest.visual.config.ts`           | Browser-mode config, WebKit, `*.visual.test.tsx`     |
| `src/visual/visualCases.tsx`        | Helper that renders a case per theme and screenshots |
| `src/**/index.visual.test.tsx`      | Visual cases, one file per component directory       |
| `src/**/__screenshots__/`           | Committed baselines                                  |
| `src/tokens/palette.ts`             | Mantine 5 colours, verbatim                          |
| `src/tokens/semantic.ts`            | Role-named colours, light and dark                   |
| `src/tokens/scales.ts`              | Space, radius, font, line height, shadow, z, motion  |
| `src/tokens/css.ts`                 | `tokensToCss(): string`                              |
| `src/ThemeProvider/global.css`      | Normalize + body styles (Mantine 5 equivalent)       |
| `src/internal/`                     | `Badge`, `Skeleton`, `Tooltip`, unstyled button      |
| `src/**/<Component>.module.css`     | Component styles                                     |

**Modified:** every file listed in the spec's component table, `packages/ui/{package.json,biome.json,vitest.config.ts}`, `src/test-utils.tsx`, `src/index.ts` (only if `GAP_PX` moves), root `package-lock.json`, `AGENTS.md`.

---

### Task 1: Visual baseline harness and primitive cases

**Files:**
- Create: `packages/ui/vitest.visual.config.ts`, `packages/ui/src/visual/visualCases.tsx`, `index.visual.test.tsx` in `Text`, `Surface`, `Spinner`, `Button`, `TextField`, `Select`, `SliderField`, `ColorField`, `Tabs`, `Dialog`, `ContextMenu`, `CommandPalette`
- Modify: `packages/ui/package.json` (dev deps, `"test:visual": "vitest run -c vitest.visual.config.ts"`), `packages/ui/vitest.config.ts` (exclude `src/**/*.visual.test.tsx`)

**Interfaces:**
- Produces:
  ```ts
  type VisualCase = {
      render: () => ReactNode
      interact?: () => Promise<void>   // hover, focus, open a popup
      target?: "subject" | "page"      // "page" for portalled popups
  }
  function visualCases(component: string, cases: Record<string, VisualCase>): void
  ```
  Registers one test per case per theme, named `${case} (${theme})`, rendering inside `ThemeProvider dark={…}` in a fixed-size padded subject element, and compares a screenshot named `${component}-${case}-${theme}`.

- [ ] **Step 1: Install.** Run `npm install`, then `npm install -D -w @sphere/ui @vitest/browser-playwright@4.1.4 playwright@<release ≥ 2 weeks old>` and `npx playwright install webkit`.
- [ ] **Step 2: Write the config.** Browser mode, `provider: playwright()`, one instance `{ browser: "webkit" }`, fixed viewport, `include: ["src/**/*.visual.test.tsx"]`, same `react()` plugin. Check the exact Vitest 4 API (`vitest/browser` `page`, `toMatchScreenshot`) with context7 before writing.
- [ ] **Step 3: Write `visualCases`** and a first case file for `Button` (`primary`, `secondary`, `disabled`, `hover`, `focus-visible`; `IconButton` `sm`, `md`, `active`, `solid active`, `disabled`).
- [ ] **Step 4: Capture and check stability.** Run `npm run test:visual -w @sphere/ui` twice. Expected: first run writes baselines, second run PASS with zero diffs.
- [ ] **Step 5: Add case files for the remaining primitives.** Each covers every prop combination the app uses (read the call sites in `apps/sphere/src`) and these states:
  - `Text`: each tone × weight, uppercase; `Heading`; `Surface`; `Spinner`.
  - `TextField`: empty with placeholder, filled, focused, error, required, `code`, with right section.
  - `Select`: closed empty, closed with value, open (`target: "page"`), searchable open with typed filter, option hover. `SegmentedControl`: each option active, hover.
  - `SliderField`: at min, mid, max, thumb hover showing the value label. `ColorField`: a light and a dark colour.
  - `Tabs`: first active, second active, disabled tab, hover. `Dialog`: open with footer (`target: "page"`).
  - `ContextMenu`: open with label, items, disabled item and shortcut (`target: "page"`), item hover.
  - `CommandPalette`: open empty, filtered, nothing found (`target: "page"`).
- [ ] **Step 6: Run twice.** Expected: baselines written, second run PASS.
- [ ] **Step 7: Commit** baselines and harness. `git commit -m "Add visual baseline tests for @sphere/ui primitives"`

### Task 2: Visual cases for layouts and composites

**Files:**
- Create: `index.visual.test.tsx` in `Layout`, `AppLayout`, `Sidebar`, `Split`, `PanelBody`, `SectionStack`, `Statusbar`, `Toolbar`, `Overlay`, `ActionBar`, `AttributeList`, `InfoRow`, `Outline`, `ErrorFallback`, `ImageMarker`, `PropertiesViewer`, `PropertiesTable`

- [ ] **Step 1: Write the cases.** Use realistic fixtures copied from the existing unit tests. Cover: `SectionStack` open and closed sections; `Statusbar` with every `StatusbarButton` state and `StatusbarBadge` width and tone, plus `StatusbarSelect`; `Toolbar` with an active item and tooltip shown; `ActionBar` with separators and a disabled item; `AttributeList` loading (skeleton), numeric and string summaries; `OutlineItem` active, inactive, hover; `ErrorFallback`; `PropertiesViewer` with image and `CopyButton` tooltip; `PropertiesTable` with numeric, string and image columns, a sorted column and a tooltip.
- [ ] **Step 2: Run twice.** Expected: baselines written, second run PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add visual baseline tests for @sphere/ui layouts and composites"`

### Task 3: Design tokens and ThemeProvider

**Files:**
- Create: `packages/ui/src/tokens/{palette.ts,semantic.ts,scales.ts,css.ts,index.ts,index.test.ts}`, `packages/ui/src/ThemeProvider/{global.css,index.test.tsx}`
- Modify: `packages/ui/src/ThemeProvider/index.tsx`, `packages/ui/src/hooks/useAccentColor.ts`, `packages/ui/src/Layout/gap.ts`

**Interfaces:**
- Produces: `palette`, `semantic: Record<SemanticColor, { light: string; dark: string }>`, `space`, `radius`, `fontSize`, `fontFamily`, `lineHeight`, `shadow`, `zIndex`, `duration`; `tokensToCss(): string`; `type ColorScheme = "light" | "dark"`; `useColorScheme(): ColorScheme`.

- [ ] **Step 1: Write failing tests.**

```ts
it("palette copies Mantine 5 shades verbatim", () => {
    expect(palette.blue[6]).toBe("#228be6")
    expect(palette.dark[7]).toBe("#1A1B1E")
})
it("space matches today's pixels", () => {
    expect(space).toEqual({ xxs: 2, xs: 4, sm: 12, md: 16, lg: 20, xl: 28 })
})
it("GAP_PX is derived from space", …)
it("tokensToCss emits light on :root and dark on [data-theme=dark]", () => {
    const css = tokensToCss()
    expect(css).toContain(`:root{`)
    expect(css).toContain(`--sphere-color-body:${palette.white}`)
    expect(css).toContain(`:root[data-theme="dark"]{`)
    expect(css).toContain(`--sphere-space-sm:12px`)
})
it("ThemeProvider sets data-theme and color-scheme on <html> and updates on toggle", …)
it("useColorScheme reports the provider's scheme", …)
it("useAccentColor returns blue.7 in light and blue.5 in dark", …)
```

- [ ] **Step 2: Run to verify failure.** Run: `npm test -w @sphere/ui -- src/tokens src/ThemeProvider`. Expected: FAIL.
- [ ] **Step 3: Implement tokens** with values from the spec tables and `@mantine/styles/esm/theme/default-colors.js` / `default-theme.js`.
- [ ] **Step 4: Implement `ThemeProvider`.** Inject `tokensToCss()` once in a `<style>` element; set `document.documentElement` `data-theme` and `style.colorScheme` in an effect; provide scheme context; import `global.css` ported from Mantine's `NormalizeCSS.js` and `GlobalStyles.js`, using tokens. Keep `MantineProvider` wrapping children (components still need it) but drop `withGlobalStyles` and `withNormalizeCSS`. `useAccentColor` reads `semantic["accent-icon"]` for the current scheme.
- [ ] **Step 5: Run unit and visual tests.** Expected: PASS, baselines unchanged.
- [ ] **Step 6: Commit.** `git commit -m "Add design tokens and own global styles to ThemeProvider"`

### Task 4: Text, Surface, Spinner and internal parts

**Files:**
- Modify: `packages/ui/src/{Text,Surface,Spinner}/index.tsx` (+ `.module.css`)
- Create: `packages/ui/src/internal/{Badge.tsx,Badge.module.css,Skeleton.tsx,Skeleton.module.css,unstyled-button.module.css,index.ts}`

**Interfaces:**
- Produces (internal, not exported from `src/index.ts`): `Badge({ size: "xs" | "sm"; variant: "light" | "filled"; radius: "sm" | "xl"; className?; title?; children })`, `Skeleton({ height: number; width?: number | string })`, `unstyledButton` class.

- [ ] **Step 1: Port styles** from Mantine `Text`, `Title`, `Paper`, `Loader` (oval SVG from `@mantine/core/esm/Loader/loaders/Oval.js`), `Badge`, `Skeleton`, `UnstyledButton`, for the sizes and variants their call sites use.
- [ ] **Step 2: Replace internals.** No Mantine import remains in these files.
- [ ] **Step 3: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "Rebuild Text, Surface and Spinner without Mantine"`

### Task 5: Buttons and form controls

**Files:**
- Modify: `packages/ui/src/Button/{Button,IconButton}.tsx`, `packages/ui/src/TextField/index.tsx`, `packages/ui/src/Select/{Select,SegmentedControl}.tsx` (+ `.module.css` each)
- Create: `packages/ui/src/internal/Tooltip.tsx` (+ css)
- Modify: `packages/ui/package.json` (add `@base-ui/react@^1.9.0`)

**Interfaces:**
- Produces (internal): `Tooltip({ label: string; side?: "top" | "right" | "bottom" | "left"; delay?: number; closeDelay?: number; duration?: number; disabled?: boolean; children: ReactElement })`.

- [ ] **Step 1: Write failing unit tests** for behaviour Base UI must keep:

```tsx
it("Select opens with ArrowDown and picks with Enter", …)
it("searchable Select filters options by typed text", …)
it("SegmentedControl moves with arrow keys and reports the value", …)
it("Tooltip shows its label after the open delay", …)
```

- [ ] **Step 2: Run them.** Expected: the new keyboard tests may already PASS on Mantine; any that fail must pass after Step 3.
- [ ] **Step 3: Rebuild** on Base UI `Button`, `Field` + `Input`, `Select` (or `Combobox` when `searchable`), `ToggleGroup` + `Toggle`, `Tooltip`, porting Mantine `Button`, `ActionIcon`, `Input`, `TextInput`, `Select`, `SegmentedControl`, `Tooltip` styles.
- [ ] **Step 4: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Rebuild buttons and form controls on Base UI"`

### Task 6: SliderField and ColorField

**Files:**
- Modify: `packages/ui/src/SliderField/index.tsx`, `packages/ui/src/ColorField/index.tsx` (+ `.module.css`)
- Modify: `packages/ui/package.json` (add `react-colorful@^5.8.1`)

- [ ] **Step 1: Write failing unit tests.**

```tsx
it("SliderField Home and End jump to min and max", …)
it("ColorField reports a hex string when the hue changes", …)
```

- [ ] **Step 2: Rebuild** `SliderField` on Base UI `Field` + `Slider` (thumb value label shown on hover and drag, as Mantine does) and `ColorField` on `HexColorPicker`, styled to Mantine `Slider` and `ColorPicker` (saturation height 130, full width, hue slider below).
- [ ] **Step 3: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "Rebuild SliderField and ColorField without Mantine"`

### Task 7: Tabs and Dialog

**Files:**
- Modify: `packages/ui/src/Tabs/index.tsx`, `packages/ui/src/Dialog/index.tsx` (+ `.module.css`)

- [ ] **Step 1: Write failing unit tests.**

```tsx
it("Tabs moves focus with arrow keys and skips disabled tabs", …)
it("Dialog traps focus and returns it to the opener on close", …)
it("Dialog closes on backdrop click", …)
```

- [ ] **Step 2: Rebuild** on Base UI `Tabs` and `Dialog`, porting the current `Tabs` styles and Mantine `Modal` (centered, `md` width, overlay, `pop` transition).
- [ ] **Step 3: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "Rebuild Tabs and Dialog on Base UI"`

### Task 8: Context menu, command palette and hotkeys

**Files:**
- Modify: `packages/ui/src/ContextMenu/index.tsx`, `packages/ui/src/CommandPalette/index.tsx`, `packages/ui/src/hooks/useHotkeys.ts` (+ tests, `.module.css`)

**Interfaces:**
- Produces: `parseHotkey(hotkey: string): { key: string; mod: boolean; shift: boolean; alt: boolean }` (internal, `"mod"` = ⌘ on macOS, Ctrl elsewhere; spaces ignored, so `"mod + p"` works).

- [ ] **Step 1: Write failing unit tests.**

```ts
it("parseHotkey reads mod+V and mod + p", () => {
    expect(parseHotkey("mod+V")).toEqual({ key: "v", mod: true, shift: false, alt: false })
    expect(parseHotkey("mod + p")).toEqual({ key: "p", mod: true, shift: false, alt: false })
})
it("useHotkeys ignores events from inputs and textareas", …)
it("ContextMenu opens at the given point and closes on Escape and outside click", …)
it("ContextMenu flips to stay inside the viewport near the right edge", …)
it("CommandPalette opens on its shortcut, filters by title and description, runs the chosen command with Enter", …)
it("CommandPalette closes on Escape", …)
```

- [ ] **Step 2: Run to verify failure,** then **rebuild:** `ContextMenu` on Base UI `Menu` with a virtual anchor at `position` (`side="right"`, `align="start"`, offset 10, width 200, `md` shadow); `CommandPalette` on Base UI `Dialog` + `Autocomplete`, porting Mantine `Spotlight` styles; `useHotkeys` as a `keydown` listener on `document` using `parseHotkey`.
- [ ] **Step 3: Run unit and visual tests.** Expected: PASS. `rg '@mantine/(hooks|spotlight)' packages` finds nothing.
- [ ] **Step 4: Commit.** `git commit -m "Rebuild context menu, command palette and hotkeys"`

### Task 9: Layouts

**Files:**
- Modify: `packages/ui/src/{Layout/Row,AppLayout,Sidebar,Split,PanelBody,SectionStack,Overlay}` (+ `.module.css`)

- [ ] **Step 1: Convert** every `createStyles` and Mantine `Flex`/`Box`/`UnstyledButton` to CSS Modules and plain elements, values from tokens.
- [ ] **Step 2: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Move @sphere/ui layouts to CSS Modules"`

### Task 10: Statusbar, Toolbar and ActionBar

**Files:**
- Modify: `packages/ui/src/Statusbar/{index,StatusbarButton,StatusbarBadge,StatusbarSelect}.tsx`, `packages/ui/src/Toolbar/index.tsx`, `packages/ui/src/ActionBar/index.tsx` (+ `.module.css`)

**Interfaces:**
- Consumes: `IconButton`, internal `Badge`, `Tooltip`, `unstyledButton` (Tasks 4–5).

- [ ] **Step 1: Rebuild** on the internal parts; `Toolbar`'s Mantine `Navbar` becomes a plain element with the same box; move `StatusbarSelect` inline styles to CSS.
- [ ] **Step 2: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Rebuild Statusbar, Toolbar and ActionBar without Mantine"`

### Task 11: Composites

**Files:**
- Modify: `packages/ui/src/{AttributeList/*,InfoRow,Outline/*,ErrorFallback,ImageMarker,PropertiesViewer/*}` (+ `.module.css`)

- [ ] **Step 1: Rebuild** on `Stack`, `Row`, `Text`, `Button`, internal `Badge`, `Skeleton`, `Tooltip`, `unstyledButton`; Mantine `Image` becomes `img` with the same box and fit.
- [ ] **Step 2: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "Rebuild @sphere/ui composites without Mantine"`

### Task 12: PropertiesTable

**Files:**
- Modify: `packages/ui/src/PropertiesTable/{index.tsx,BarChart.tsx}` (+ `.module.css`)

- [ ] **Step 1: Add a unit test file** (none exists): renders column headers and rows from fixture items; clicking a header reports the new sort; an image cell renders an `img`.
- [ ] **Step 2: Run it on the Mantine version.** Expected: PASS.
- [ ] **Step 3: Rebuild.** Drop the nested `MantineProvider`; port its component defaults and the `createStyles` block to CSS; use internal `Badge`, `Tooltip`, `IconButton`.
- [ ] **Step 4: Run unit and visual tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Rebuild PropertiesTable without Mantine"`

### Task 13: Remove Mantine

**Files:**
- Modify: `packages/ui/src/ThemeProvider/index.tsx`, `packages/ui/src/test-utils.tsx`, `packages/ui/package.json`, `packages/ui/biome.json`, `package-lock.json`, `AGENTS.md`

- [ ] **Step 1: Record bundle size before.** On `master`, run `npm run build` and note JS and CSS sizes from Vite's output.
- [ ] **Step 2: Remove `MantineProvider`** from `ThemeProvider` and switch `test-utils.tsx` to `ThemeProvider dark={false}`. Run: `rg -l '@mantine|@emotion' apps packages`. Expected: no output.
- [ ] **Step 3: Remove packages.** `npm uninstall -w @sphere/ui @mantine/core @mantine/hooks @mantine/spotlight @emotion/react`. Run: `rg '@mantine|@emotion' package-lock.json`. Expected: no output.
- [ ] **Step 4: Add the lint rule** to `packages/ui/biome.json`: a `patterns` entry restricting `@mantine/**` and `@emotion/**`, alongside the existing `paths`. Prove it: a temporary `import { Box } from "@mantine/core"` makes `npm run lint -w @sphere/ui` FAIL; remove it, lint PASS.
- [ ] **Step 5: Update `AGENTS.md`:** `@sphere/ui` is "Base UI + CSS Modules, styled with design tokens in `src/tokens/`"; "Key Dependencies" lists `@base-ui/react` instead of Mantine 5; document `npm run test:visual -w @sphere/ui` and that baselines must not be updated to accept a real change.
- [ ] **Step 6: Full verification.** Run: `npm run typecheck && npm run lint && npm test && npm run test:visual -w @sphere/ui && npm run build`. Expected: all PASS. Note bundle sizes after.
- [ ] **Step 7: Manual check** (`npm run tauri dev`), light and dark, switching theme at runtime: sidebar tabs; every source panel; every layer panel control; filter field; add-from-URL dialog; map context menu near window edges; statusbar; map toolbar; draw mode; command palette (`mod+P`); `mod+V` paste; properties window and table.
- [ ] **Step 8: Write the PR description** from `docs/plans/20261025-base-ui-migration-notes.md` (no-op styles kept, bundle sizes before and after), then delete the notes file.
- [ ] **Step 9: Commit.** `git commit -m "Remove Mantine and Emotion"`
- [ ] **Step 10: After merge,** move this plan to `docs/plans/completed/`.
