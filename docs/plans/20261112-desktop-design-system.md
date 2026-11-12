# Desktop design system and Storybook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `@sphere/ui` into a native desktop design language (OS X El Capitan principles) built on one button primitive and new tokens, and add a Storybook with artboards, controls and compositions that opens with `make storybook`.

**Architecture:** Storybook is added first so every later task updates the stories of the components it touches. New tokens are introduced next, alongside a temporary `tokens/legacy.ts` holding the old Mantine values that CSS still references; each component task moves its CSS onto the new roles; the last task deletes `legacy.ts`, regenerates screenshot baselines and documents the result.

**Tech Stack:** React 19, Base UI, CSS Modules, TypeScript tokens emitted as CSS custom properties, Storybook 10.6.5 (`@storybook/react-vite`), Vitest (happy-dom unit, WebKit visual), Biome.

**Spec:** `docs/specs/20261112-desktop-design-system.md` — read it in full before any task. Its "Design principles", "Design tokens" and "Components" sections are the requirements of every task below.

## Global Constraints

- Repo rules in `AGENTS.md` apply to all code, stories included: double quotes, no semicolons, 4-space indent, `function` components, no `any`, no `!`, no `as` casts, no magic numbers (name constants), no nested ternaries, no lint-suppression comments, no `console.log`.
- Run `npm run format` after every code change; `npm run lint`, `npm run typecheck` and `npm test` pass at the end of every task.
- `@sphere/ui` must not import from the app, Tauri, Redux or maplibre; icons only from `@sphere/icons`.
- `@sphere/ui`, `@sphere/utils`, `@sphere/icons` stay at version `0.0.0`. No crate under `crates/` is touched, so no crate bump.
- Storybook packages pinned exactly to `10.6.5` (the newest release older than two weeks on 2026-11-12). Dev dependencies of `@sphere/ui` only.
- No hover style on any control; `cursor: default` on controls (`text` in editable text, resize cursors on handles); never `pointer` or `not-allowed`; nothing transforms on `:active`.
- No component imports another component's `*.module.css`. Shared styles live in `packages/ui/src/internal/` modules.
- Commits are one line, imperative, no body, no trailers.
- **Visual tests:** from Task 4 on, `npm run test:visual -w @sphere/ui` is expected to differ from the old baselines. Do not run `-u` before Task 12. Do not delete baseline files except Toolbar's in Task 3.

## Review Focus

- **Keyboard users lose focus visibility** when hover/outline styles are removed: every button-like component must still show the `focus-ring` glow on `:focus-visible` (pinned by the shared interaction helper in Task 5 and the focus-visible visual cases in Task 12).
- **Selected tree row on a coloured bulb**: a layer-coloured bulb must keep its colour on the accent selection fill while other glyphs turn `on-accent` (pinned in Task 8).
- **Long labels in menus and tabs** (long source names, long shortcuts) must truncate with ellipsis, not widen the menu past the window or wrap (pinned by a long-label visual case in Task 6 and a long-text story in Task 2).
- **Disabled + active together** (a toggled tool that becomes unavailable) must read as disabled, not as active (pinned in Task 5).
- **Dark theme contrast**: secondary labels and glyph buttons on `window` and `sidebar` in dark theme must meet 4.5:1 (pinned by the contrast test in Task 4).

---

### Task 1: Storybook infrastructure and Foundations

**Files:**
- Modify: `packages/ui/package.json` (scripts, devDependencies), `package-lock.json`, `.gitignore`, `packages/ui/tsconfig.json` (include `.storybook`), `packages/ui/biome.json` (lint `.storybook/**`)
- Create: `Makefile`, `packages/ui/.storybook/main.ts`, `packages/ui/.storybook/preview.tsx`, `packages/ui/src/stories/Principles.mdx`, `packages/ui/src/stories/foundations/Colors.stories.tsx`, `Typography.stories.tsx`, `Spacing.stories.tsx`, `Radius.stories.tsx`, `Shadows.stories.tsx`, `packages/ui/src/stories/foundations/Swatch.tsx`

**Interfaces:**
- Produces: global `theme` (`"light" | "dark"`) in the Storybook toolbar; every story is wrapped in `<ThemeProvider dark={theme === "dark"}>`. Story titles follow the spec's sidebar groups (`Foundations/…`, `Controls/…`, `Menus/…`, `Containers/…`, `Data/…`, `Statusbar/…`, `Compositions/…`). Stories glob: `../src/**/*.mdx`, `../src/**/*.stories.tsx`.
- Foundations stories render from the exported token objects (`semantic`, `space`, `radius`, `fontSize`, `shadow`, …) by iterating them, never from copied values, so Task 4's new tokens appear without editing these files beyond adding new groups.

- [ ] Run `npm ci` at the repo root (the worktree starts without `node_modules`)
- [ ] Install `storybook@10.6.5`, `@storybook/react-vite@10.6.5`, `@storybook/addon-docs@10.6.5` as exact dev dependencies of `@sphere/ui` (`npm i -D -E -w @sphere/ui …`)
- [ ] Add scripts `"storybook": "storybook dev -p 6006"` and `"build-storybook": "storybook build -o storybook-static"` to `packages/ui/package.json`
- [ ] Write `.storybook/main.ts` (framework `@storybook/react-vite`, addons `@storybook/addon-docs`, the stories glob above, `optimizeDeps.include` reusing the list in `vitest.visual.config.ts` if a re-optimisation reload shows up)
- [ ] Write `.storybook/preview.tsx`: `globalTypes.theme` toolbar item (light / dark, default light), the `ThemeProvider` decorator, `parameters.layout: "centered"`, `backgrounds: { disable: true }`, `controls.matchers` for colours
- [ ] Root `Makefile` with `.PHONY: storybook storybook-build`; `storybook` runs `test -d node_modules || npm ci` then `npm run storybook -w @sphere/ui`; `storybook-build` runs `npm run build-storybook -w @sphere/ui`. Recipes use tabs
- [ ] Add `storybook-static/` and `*.storybook.log` to `.gitignore`
- [ ] Write the Foundations stories (one swatch per semantic colour showing the light and dark value side by side, type ramp from `fontSize`/`fontWeight`, bars per `space` entry, boxes per `radius` and `shadow` entry) and `Principles.mdx` summarising the spec's Design principles (each principle in two or three sentences, link to the spec path)
- [ ] Verify: `npm run build-storybook -w @sphere/ui` exits 0; `npm run typecheck -w @sphere/ui` and `npm run lint -w @sphere/ui` pass; `npm test -w @sphere/ui` still passes (stories are not collected)
- [ ] Verify: `make storybook` starts the dev server on port 6006 (start it in the background, `curl -sf http://localhost:6006/index.json | jq '.entries | length'` returns > 0, then stop it)
- [ ] Commit: `Add Storybook to @sphere/ui with Foundations pages`

### Task 2: Stories for Controls and Menus

**Files:**
- Create: `index.stories.tsx` in `packages/ui/src/{Button,ActionBar,VisibilityToggle,Select,Tabs,TextField,ColorField,SliderField,ContextMenu,CommandPalette}/`, `packages/ui/src/internal/Tooltip.stories.tsx`
- Create: `packages/ui/src/stories/fixtures.ts` (shared plausible GIS fixture data: source names, layer names, property rows, commands)

**Interfaces:**
- Produces: `fixtures.ts` exports `SOURCE_NAMES: ReadonlyArray<string>`, `LAYER_OPTIONS: ReadonlyArray<SelectOption>`, `COMMANDS: ReadonlyArray<Command>`, `PROPERTY_ROWS` (shape of `PropertyItem`), `TREE_ITEMS: ReadonlyArray<TreeItem>` (folders, sources, source-layers, three levels). Later tasks extend it rather than define their own.
- Story conventions every later task follows: `const meta = { title, component, tags: ["autodocs"], args, argTypes } satisfies Meta<typeof X>`; callbacks as `fn()` from `storybook/test`; a `Default` story driven by Controls; named stories per state; a `Gallery` story laying every variant × size × state side by side where the component has more than one variant; controlled components wrapped in a small stateful `function …Demo` so Controls and interaction both work.

- [ ] `Button/index.stories.tsx`: titles `Controls/Button` and `Controls/IconButton` (two files are fine if one meta per file is required: `Button.stories.tsx`, `IconButton.stories.tsx`); Default, Disabled, Gallery; IconButton icon picked through an `argTypes` select over a few `@sphere/icons` glyphs
- [ ] `ActionBar`, `VisibilityToggle`, `SegmentedControl` + `Select` (two stories files in `Select/`), `Tabs`, `TextField` (empty, placeholder, value, error, long value), `ColorField`, `SliderField` stories
- [ ] `ContextMenu` stories open (`opened: true`) at a fixed position with items, icons, shortcuts, a disabled item, a label, and a long-label item (Review Focus); `CommandPalette` story opened by a `play` function pressing its shortcut; `internal/Tooltip.stories.tsx` titled `Menus/Tooltip` opened by a `play` hover
- [ ] Every story uses `fixtures.ts` for data, no inline magic values
- [ ] Verify: `npm run build-storybook -w @sphere/ui` exits 0, lint/typecheck pass
- [ ] Commit: `Add Storybook stories for controls and menus`

### Task 3: Stories for Containers, Data and Statusbar, remove Toolbar, coverage test

**Files:**
- Create: `index.stories.tsx` in `packages/ui/src/{Dialog,Sidebar,SectionStack,PanelBody,Surface,Split,Overlay,AppLayout,Layout,Tree,PropertiesTable,PropertiesViewer,AttributeList,InfoRow,Text,Spinner,ImageMarker,ErrorFallback,Statusbar}/`
- Create: `packages/ui/src/stories/coverage.test.ts`
- Delete: `packages/ui/src/Toolbar/` (component, tests, visual test, baselines); remove `export * from "./Toolbar"` from `packages/ui/src/index.ts`; remove the commented `<Toolbar>` lines in `apps/sphere/src/components/App/index.tsx`; drop `IconHome2`, `IconGauge`, `IconDeviceDesktopAnalytics`, `IconCalendarStats`, `IconUser`, `IconFingerprint` from `packages/icons/src/tabler.ts` if nothing else uses them (`rg` each)

**Interfaces:**
- Produces: `coverage.test.ts` with `const EXEMPT: Record<string, string>` mapping folder → reason (`hooks`, `selection`, `tokens`, `ThemeProvider`); it parses `export * from "./X"` lines of `src/index.ts`, takes the first path segment as the folder, and asserts `src/<folder>/index.stories.tsx` or any `src/<folder>/*.stories.tsx` exists.

- [ ] Write `coverage.test.ts`; run `npm test -w @sphere/ui -- coverage` and confirm it fails listing the folders without stories
- [ ] Delete Toolbar as listed; `rg -n "Toolbar|NavbarLink" packages apps` shows only `MapToolbar` and unrelated names
- [ ] Write the stories: Dialog opened (with and without footer); Tree with `TREE_ITEMS`, a selected row and expanded folders, controlled by a demo wrapper; PropertiesTable with `PROPERTY_ROWS` (default, sorted, last page); Statusbar file titled `Statusbar/Statusbar` plus per-part stories (`StatusbarButton`, `StatusbarBadge`, `StatusbarSelect`) in the same folder; SectionStack with three sections; Split with two panes; Layout `Row`/`Stack` with gap/align controls; Text tones/weights Gallery; ErrorFallback both modes and `RootErrorFallback`
- [ ] Verify: coverage test passes, `npm test`, lint, typecheck, `npm run build-storybook -w @sphere/ui` pass
- [ ] Commit: `Add Storybook stories for containers, data and statusbar; remove demo Toolbar`

### Task 4: New tokens alongside legacy tokens

**Files:**
- Create: `packages/ui/src/tokens/legacy.ts` (the current `palette`, `semantic` entries and scale values the new set does not redefine, renamed `legacyPalette`, `legacySemantic`, `legacyScales`)
- Modify: `packages/ui/src/tokens/palette.ts`, `semantic.ts`, `scales.ts`, `css.ts`, `index.ts`, `index.test.ts`, `packages/ui/src/ThemeProvider/global.css`, Foundations stories (new groups)
- Create: `packages/ui/src/tokens/references.test.ts`, `packages/ui/src/tokens/contrast.ts` (+ `contrast.test.ts`)

**Interfaces:**
- Produces (CSS custom properties, all `--sphere-` prefixed):
  - colours `--sphere-color-<role>` for every role in the spec's semantic table: `window`, `content`, `sidebar`, `popup`, `popup-border`, `tooltip`, `tooltip-text`, `control`, `control-pressed`, `control-border`, `control-shadow`, `separator`, `label`, `label-secondary`, `label-tertiary`, `glyph-pressed`, `accent`, `accent-pressed`, `on-accent`, `selection`, `selection-inactive`, `focus-ring`, `danger`, `warning`, `ok`, `scrim`, plus `chart-bar`, `marker-surface`, `marker-shadow` defined by reference
  - `--sphere-space-{2,4,6,8,12,16,20}`; `--sphere-radius-{none,tooltip,control,popup,window,pill}`; `--sphere-font-size-{mini,small,body,regular}` = 10/11/12/13px; `--sphere-line-height-{text,tight}` = 1.3/1.15; `--sphere-control-height-{sm,md}` = 18/22px; `--sphere-row-height` 22px; `--sphere-menu-item-height` 20px; `--sphere-shadow-{control,popup,window}`; `--sphere-duration-fast` 120ms; `--sphere-duration-tooltip-delay` 700ms; `--sphere-opacity-disabled` 0.35; `--sphere-z-index-*` unchanged
  - TS: `semantic: Record<SemanticColor, SemanticValue>` with the new names; `palette` with `gray` (13 steps, index 0 white … 12 black) and `blue`, `red`, `orange`, `yellow`, `green` as `{ light: string; dark: string }`; `tokensToCss()` emits new + legacy, new wins on a name clash
  - `contrastRatio(foreground: string, background: string): number` in `contrast.ts` (WCAG relative luminance, hex input)
- Legacy names whose spelling clashes with a new role (`accent`, `separator`, `focus-ring`, `danger`, `on-accent`, `tooltip-text`) take the new value immediately; this is the expected interim visual change.

- [ ] Write `references.test.ts`: collect every `var(--sphere-[a-z0-9-]+)` in `src/**/*.module.css` and `src/ThemeProvider/global.css` (read with `node:fs`, glob with `fs.globSync` or a recursive `readdirSync`), assert each name is declared in `tokensToCss()` output; run it and confirm it passes on the current tree (baseline)
- [ ] Write `contrast.test.ts`: for both schemes, `contrastRatio(label, window|content|sidebar) >= 4.5`, `contrastRatio(label-secondary, window|content|sidebar) >= 4.5`, `contrastRatio(on-accent, accent|selection) >= 4.5`; run it, confirm it fails (no new tokens yet)
- [ ] Move old values into `legacy.ts`; write the new `palette.ts`, `semantic.ts`, `scales.ts` with the spec's values (light theme tuned to El Capitan: window `#ececec`, content `#ffffff`, accent ≈ `#1a82fb`, selection ≈ `#1063e0`; dark: window ≈ `#323232`, content ≈ `#1e1e1e`); update `css.ts` to emit both sets; update `index.test.ts` to the new names
- [ ] Rewrite `global.css`: keep `@layer sphere-base`; reset = box-sizing, `body { margin: 0; font: var(--sphere-font-size-body)/var(--sphere-line-height-text) var(--sphere-font-family-sans); background: var(--sphere-color-window); color: var(--sphere-color-label) }`, form controls `font: inherit; color: inherit`, `button { cursor: default }`, `img { vertical-align: middle; border-style: none }`, `[hidden] { display: none }`; a `@media (prefers-reduced-motion: reduce)` rule setting `transition-duration` and `animation-duration` to `0s` on `*, *::before, *::after`. Drop the rest of the normalize copy
- [ ] Add Foundations groups for control heights, opacity and durations
- [ ] Verify: references, contrast, tokens tests pass; full `npm test`, lint, typecheck, `npm run build`, `npm run build-storybook -w @sphere/ui` pass
- [ ] Commit: `Add desktop design tokens alongside legacy Mantine tokens`

### Task 5: Button primitive and every button-like component

**Files:**
- Create: `packages/ui/src/internal/ButtonBase.tsx`, `packages/ui/src/internal/button-base.module.css`, `packages/ui/src/internal/ButtonBase.test.tsx`
- Modify: `packages/ui/src/internal/index.ts`, `packages/ui/src/test-utils.tsx`, `Button/*`, `ActionBar/*`, `VisibilityToggle/*`, `Statusbar/StatusbarButton.tsx` + its css, `Statusbar/index.tsx`, `PropertiesTable/index.tsx` (pager) + css, `Dialog/index.tsx` (close) + css, `PropertiesViewer/CopyButton.tsx` + css, `SectionStack/index.tsx` + css (header), `Tree/TreeRow.tsx` + css (chevron), stories of all of these
- Delete: `packages/ui/src/internal/unstyled-button.module.css` once nothing imports it
- Modify (app): `apps/sphere/src/components/SphereMap/MapToolbar.tsx` (`appearance="solid"` → `variant="bordered"`), `apps/sphere/src/components/MapStatusbar/index.tsx` (drop `activeLook`), `apps/sphere/src/components/LayerPanel/LayerFilter.tsx` if it passes `appearance`

**Interfaces:**
- Produces:
  - `ButtonBase` (internal): `type ButtonShape = "push" | "glyph" | "bordered-glyph" | "plain"`; `type ButtonTone = "primary" | "secondary"`; `type ButtonSize = "sm" | "md"`; props `{ shape: ButtonShape; size?: ButtonSize; tone?: ButtonTone; active?: boolean; disabled?: boolean; label?: string; type?: "button" | "submit"; className?: string; onClick?: () => void; children: ReactNode }`. Renders Base UI `Button` with `data-shape`, `data-size`, `data-tone`, `data-active` attributes; `label` sets `aria-label` and `title`; `active !== undefined` sets `aria-pressed`. `className` is for layout only (flex, margin), never colour.
  - `IconButton`: `type IconButtonVariant = "glyph" | "bordered"`; props `{ icon; label; onClick; disabled?; active?; size?: IconButtonSize (default "md"); variant?: IconButtonVariant (default "glyph") }`. `IconButtonAppearance` is removed from exports.
  - `StatusbarButton`: props lose `activeLook`; `StatusbarButtonLook` removed from exports. Renders `IconButton size="sm"`.
  - `test-utils.tsx`: `hoverStyle(element, property): string` (like `pressedStyle` for `:hover`), and `expectDesktopInteraction(element: Element): void` asserting `declaredStyle(cursor)` is `"default"`, `pressedStyle(transform)` is `""`, and `hoverStyle` of `background-color`, `color`, `border-color`, `box-shadow` are all `""`.
- Styling (in `button-base.module.css` only): `push` 22px/13px, radius `control`, `control` body + `control-border` hairline + `control-shadow`; `primary` tone = `accent` body + `on-accent` text, pressed `accent-pressed`; `secondary` pressed `control-pressed`. `glyph` = no body, glyph `label-secondary`, pressed `glyph-pressed`, active `accent`. `bordered-glyph` = push body around a glyph, square, active = `control-pressed` body + `accent` glyph. `sm` = 18px box / 14px glyph, `md` = 22px box / 16px glyph. `plain` = reset only. Disabled = `opacity: var(--sphere-opacity-disabled)`, no press change, wins over active. Focus = `:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--sphere-color-focus-ring) }` (keep `control-shadow` combined on push).

- [ ] Add `hoverStyle` and `expectDesktopInteraction` to `test-utils.tsx`
- [ ] Write `ButtonBase.test.tsx`: renders each shape and calls `expectDesktopInteraction`; `label` sets `aria-label` and `title`; `aria-pressed` only when `active` is defined; disabled blocks `onClick`; disabled + active has `data-active` but the `:disabled` rule sets opacity (assert `declaredStyle(el, "opacity")` resolves to the disabled token) — run, confirm failure
- [ ] Implement `ButtonBase` and its module; run the test, confirm pass
- [ ] Rewrite `Button/index.test.tsx` parity tests to `expectDesktopInteraction` on both variants; add IconButton tests: `variant="bordered"` sets `data-shape="bordered-glyph"`, default is glyph; `expectDesktopInteraction` on both; run, confirm the new ones fail
- [ ] Rebuild `Button` (`shape="push"`, tone from `variant`) and `IconButton` on `ButtonBase`; delete `button.module.css` / `icon-button.module.css` rules now owned by the primitive (keep files only if something component-specific remains)
- [ ] Rebuild `ActionBar` actions, `VisibilityToggle`, `StatusbarButton`, the `PropertiesTable` pager buttons, `PropertiesViewer` `CopyButton` (row hover may still reveal it; the button itself has no hover style) and `Dialog` close on `IconButton`; `SectionStack` header and `TreeRow` chevron on `ButtonBase shape="plain"`; `ErrorFallback` buttons on `Button variant="secondary"`. Remove every cross-module CSS import (`rg -n "\.\./[A-Za-z]+/[a-z-]+\.module\.css" packages/ui/src` returns nothing) and every doubled/tripled selector that only existed to beat another module
- [ ] Add `expectDesktopInteraction` assertions to the existing tests of ActionBar, VisibilityToggle, StatusbarButton (Statusbar tests), the pager (PropertiesTable tests), Dialog close
- [ ] Update the app call sites; `npm run typecheck` passes for the app
- [ ] Update the stories of every touched component (IconButton `variant` control, Gallery with glyph/bordered × sm/md × rest/active/disabled/disabled+active)
- [ ] Verify: `npm test`, lint, typecheck, `npm run build`, `npm run build-storybook -w @sphere/ui` pass; `rg -n "translateY|cursor: pointer|not-allowed" packages/ui/src --glob '*.css'` shows no control rule
- [ ] Commit: `Build every button on one desktop button primitive`

### Task 6: Menu surface, popups and dialog

**Files:**
- Create: `packages/ui/src/internal/menu.module.css`
- Modify: `ContextMenu/*`, `Select/Select.tsx` + `select.module.css` + `ChevronIcon.tsx`, `CommandPalette/*`, `internal/Tooltip.tsx` + css, `Dialog/*`, their stories and unit tests, `ContextMenu/index.visual.test.tsx`, `packages/icons/src/tabler.ts` (`IconSelector` for the pop-up double chevron, `IconCheck` already present)

**Interfaces:**
- Consumes: tokens from Task 4, `IconButton` from Task 5.
- Produces: `menu.module.css` classes `surface`, `item`, `itemIcon`, `itemLabel`, `itemShortcut`, `itemCheck`, `separator`, `label` — the only menu styling, imported by ContextMenu, Select, CommandPalette. New export `ContextMenuSeparator(): JSX.Element` (renders Base UI `Menu.Separator`). ContextMenu constants: offset 0, collision padding 4px, `min-width: 160px`, `max-width` 320px with item labels truncating.
- Values: surface radius `popup`, 4px vertical padding, 0 horizontal, `popup` bg, 0.5px `popup-border` (use `box-shadow: 0 0 0 0.5px …` combined with `shadow-popup`), items 20px tall, 13px, padding-left 20px, padding-right 16px, highlighted = `selection` + `on-accent`, edge to edge, no radius; separator 1px `separator` with 5px margin above and below; label 11px `label-secondary`. Tooltip: `tooltip` bg, 0.5px border, radius `tooltip`, 11px, no arrow, open delay `duration-tooltip-delay`. Dialog: `window` bg, radius `window`, `shadow-window`, 20px padding, title 13px bold, body 13px, transparent backdrop that still captures clicks, fade over `duration-fast` with no transform. CommandPalette: same fade, no scrim, pill search field (radius `pill`), result rows use `menu.module.css` items.

- [ ] Tests first: ContextMenu renders `ContextMenuSeparator` with `role="separator"`; highlighted item has no `border-radius` (`declaredStyle(item, "border-radius")` is `""` or `0`); positioner gets `sideOffset` 0 (assert via a rendered `data-side`/style or by exporting the constant and testing it); Select current option shows the check glyph; Dialog popup has no `transform` in `[data-starting-style]` rules; run, confirm failures
- [ ] Implement `menu.module.css` and restyle ContextMenu, Select (pop-up trigger with `IconSelector` right, list via the menu surface, check on the selected option), CommandPalette, Tooltip, Dialog as above
- [ ] Add a long-label ContextMenu visual case (`ContextMenu-long-label`) and a separator case; do not update baselines
- [ ] Update stories (ContextMenu with separator, Select open via `play`, Dialog, CommandPalette)
- [ ] Verify: `npm test`, lint, typecheck, `npm run build-storybook -w @sphere/ui`
- [ ] Commit: `Restyle menus, popups and dialog as native desktop surfaces`

### Task 7: Fields, segmented control and tabs

**Files:**
- Modify: `internal/input.module.css`, `TextField/*`, `ColorField/*`, `SliderField/*`, `Select/SegmentedControl.tsx` + css, `Select/index.ts`, `Tabs/*`, their stories and tests

**Interfaces:**
- Produces: `export type SegmentedControlOption = SelectOption & { icon?: ReactNode }`; `SegmentedControlProps.options: ReadonlyArray<SegmentedControlOption>`. An option with `icon` renders the icon only, with `aria-label` = `label` and `title` = `label`. `SegmentedControlProps` gains `size?: "sm" | "md"` (default `"md"`).
- Values: text field radius `none`, `content` bg, `control-border` hairline, height `control-height-md`, 12px, focus ring (3px `focus-ring` box-shadow) on `:focus` (mouse too), label 11px semibold `label-secondary`, error 11px `danger`. Segmented control and Tabs share one look: height `control-height-md`, 12px, radius `control` on the outer ends, segments separated by `control-border`, unselected = `control` body, selected = `accent` + `on-accent`, no hover, `cursor: default`. Tabs list centred. Slider: 4px track `control-border` with `accent` fill, 16px white circular knob, hairline border, `shadow-control`, no growth on drag, value shown as text right-aligned in the label row (the floating bubble is removed). ColorField: colour well = square swatch inside a bordered `control` frame, radius `none`; picker popup uses the popup surface tokens.

- [ ] Tests first: SegmentedControl option with `icon` exposes a radio named by `label` and renders no visible label text; Tabs and SegmentedControl labels pass `expectDesktopInteraction`; SliderField renders its current value as text next to the label (`screen.getByText("40")` for `value={40}`) and no element with the old bubble class; TextField `declaredStyle(input, "border-radius")` resolves to the `none` radius; run, confirm failures
- [ ] Implement
- [ ] Stories: SegmentedControl icon-only story and Gallery (text/icon × sm/md); Tabs; SliderField; TextField states; ColorField
- [ ] Verify: `npm test`, lint, typecheck, `npm run build-storybook -w @sphere/ui`
- [ ] Commit: `Restyle fields, segmented control and tabs for desktop`

### Task 8: Outline: tree, section stack, sidebar, split

**Files:**
- Create: `packages/icons/src/custom/IconDisclosure.tsx`, `packages/icons/src/custom/index.ts`; modify `packages/icons/src/index.ts`, `packages/icons/src/index.test.tsx`
- Modify: `Tree/index.tsx` (`ROW_HEIGHT` → 22), `Tree/TreeRow.tsx` + css, `SectionStack/index.tsx` (`SECTION_HEADER_HEIGHT` → 22) + css, `Sidebar/*`, `Split/*`, `AppLayout/*`, their stories and tests

**Interfaces:**
- Produces: `IconDisclosure(props: IconProps)`: a filled right-pointing triangle SVG honouring `size`, `color` (default `currentColor`), `className`, same props as Tabler icons, exported from `@sphere/icons`.
- Values: rows `row-height`, 12px, no hover; selected row bg `selection` with text/glyphs `on-accent` when the tree container matches `:focus-within`, else `selection-inactive` with `label` text; glyphs that receive an explicit `color` prop keep it. Disclosure 10px glyph in `label-secondary`, rotates 90° over `duration-fast`. Section header: `row-height`, 11px semibold uppercase `label-secondary`, letter-spacing 0.02em, `separator` line on top, no fill. Sidebar bg `sidebar`. Split sash `separator`, focused sash `accent`.

- [ ] Tests first: icons test asserts `IconDisclosure` renders an `svg` with the given `size` and `currentColor` fill; TreeRow selected row inside a focused tree gets the `on-accent` colour rule (`declaredStyle` on `.row.selected` under `:focus-within` selector) and the bulb rendered with `color="#ff0000"` keeps `#ff0000` (Review Focus); `expectDesktopInteraction` on a tree row (no hover background); the SectionStack header-height pin test updated to 22; run, confirm failures
- [ ] Implement
- [ ] Stories: Tree focused vs unfocused selection side by side, a coloured bulb on the selected row; SectionStack; Sidebar; Split
- [ ] Verify: `npm test` (both packages and the app; app tests that assert row/header heights are updated to 22), lint, typecheck, `npm run build-storybook -w @sphere/ui`
- [ ] Commit: `Restyle outlines as desktop source lists`

### Task 9: Statusbar, table and the remaining components

**Files:**
- Modify: `Statusbar/*` (bar, badge, select), `PropertiesTable/*`, `PropertiesViewer/*`, `AttributeList/*`, `InfoRow/*`, `PanelBody/*`, `Surface/*`, `Text/*`, `Layout/*`, `Overlay/*`, `Spinner/*`, `ErrorFallback/*`, `ImageMarker/*`, `internal/Badge*`, `internal/Skeleton*`, `internal/ValueImage*`, their stories and tests

**Interfaces:**
- Values: statusbar height `row-height`, `window` bg, `separator` top line, 10px `label-secondary`; `StatusbarBadge` = plain text with `font-variant-numeric: tabular-nums`, fixed widths kept, error tone = `danger` text, no fill, no `top` nudge; `StatusbarSelect` = borderless small pop-up, 10px, `label-secondary`. PropertiesTable: `content` bg, `separator` grid lines, header row `window` bg 11px semibold, resizer transparent with `col-resize` cursor (no hover reveal), footer = statusbar look. Text: base 12px with `line-height-text`; `heading` 13px bold. Badges radius `tooltip`. Every legacy `--sphere-*` reference in these files is replaced by a new role.

- [ ] Tests first: StatusbarBadge error tone has no background (`declaredStyle(el, "background-color")` is `""` or `transparent`); PropertiesTable resizer `hoverStyle(el, "opacity")` is `""`; existing Text tests updated to the new sizes; run, confirm failures
- [ ] Implement
- [ ] Verify: `rg -o "var\(--sphere-[a-z0-9-]+\)" packages/ui/src --glob '*.css' | sort -u` lists only new token names (compare against the Task 4 interface list); `npm test`, lint, typecheck, `npm run build-storybook -w @sphere/ui`
- [ ] Commit: `Move statusbar, table and remaining components onto desktop tokens`

### Task 10: App call sites and MapToolbar

**Files:**
- Modify: `apps/sphere/src/components/SphereMap/MapToolbar.tsx` (+ its test if present, create `MapToolbar.test.tsx` if not), any other app file `rg -n "style=\{\{" apps/sphere/src` flags as styling around the library

**Interfaces:**
- Consumes: `SegmentedControl` with `SegmentedControlOption.icon` (Task 7), `Overlay` if it fits the bottom-centre slot.

- [ ] Write `MapToolbar.test.tsx` first (render with a test store; asserts one radio per tool named `Navigation`, `Select`, `Info`; clicking `Select` dispatches `app.setMapTool("select")`; `Escape` resets to the default tool; renders nothing in zen mode); run against the current component and confirm the new assertions about radios fail
- [ ] Replace the inline-styled `Row` of `IconButton`s with an icon-only `SegmentedControl` (`label="Map tool"`); the wrapper keeps only `position`, `bottom`, `left`, `transform`, `zIndex` (named constants)
- [ ] Review `PhotoLayer/Badge.tsx`, `RectSelectOverlay.tsx`, `Draw.tsx` inline styles: positioning-only styles stay; colours/radii that imitate library looks move to a library component or are removed
- [ ] Verify: app `npm test -w @sphere/app`, lint, typecheck, `npm run build`
- [ ] Commit: `Use library controls for the map toolbar`

### Task 11: Composition stories

**Files:**
- Create: `packages/ui/src/stories/compositions/{MainWindow,SourcesSidebar,LayerInspector,PropertiesWindow,TreeContextMenu,DialogOverWindow,CommandPaletteOverWindow}.stories.tsx`, `packages/ui/src/stories/compositions/MapPlaceholder.tsx`
- Modify: `packages/ui/src/stories/fixtures.ts` (extend only)

**Interfaces:**
- Consumes: every public component; fixtures from Task 2.
- Story params: `layout: "fullscreen"`, title `Compositions/<Name>`, a fixed window frame of 1200×760 (named constants) so screens look like an app window.

- [ ] `MapPlaceholder`: a neutral area (hatched or flat `content` with a centred caption "Map"), honest about not being a map
- [ ] MainWindow: `AppLayout` + `Split` with `Sidebar` (Tabs Sources/Layers, `ActionBar`, `Tree` with `TREE_ITEMS`, `SectionStack` with a layer inspector), map placeholder with the map tool `SegmentedControl` over it, `Statusbar` with badges, buttons and select
- [ ] SourcesSidebar, LayerInspector (Select, SliderField, ColorField, TextField, SegmentedControl), PropertiesWindow (PropertiesTable with footer), TreeContextMenu (tree + open ContextMenu at a row with separator), DialogOverWindow (MainWindow + open Dialog with Cancel/primary buttons), CommandPaletteOverWindow (opened by `play`)
- [ ] Composition stories are controlled by small stateful demo wrappers so clicking works (select a row, switch tabs, toggle bulbs)
- [ ] Verify: `npm run build-storybook -w @sphere/ui`, lint, typecheck
- [ ] Commit: `Add composition stories for the main screens`

### Task 12: Remove legacy tokens, regenerate baselines, document

**Files:**
- Delete: `packages/ui/src/tokens/legacy.ts`
- Modify: `packages/ui/src/tokens/css.ts`, `index.ts`, visual test files that need new cases, all `__screenshots__/*.png`, `AGENTS.md`
- Move: `docs/plans/20261112-desktop-design-system.md` → `docs/plans/completed/`

- [ ] Delete `legacy.ts` and its emission; `references.test.ts` passes (proves no CSS uses a removed token); `rg -n "Mantine" packages/ui/src` returns only historical notes worth keeping, otherwise remove those comments
- [ ] Add visual cases: IconButton `active` glyph and bordered, `disabled-active`; Button `pressed` (use the existing `mouseDown`/`mouseUp` browser commands); Tree selected focused and unfocused; ContextMenu separator and long label (from Task 6); SegmentedControl icon-only; Statusbar default. Hover cases stay and must equal their rest images
- [ ] Ensure WebKit is installed for Playwright (`npx playwright install webkit` from `packages/ui`)
- [ ] Run `npm run test:visual -w @sphere/ui -- -u` on macOS to regenerate every baseline, then run `npm run test:visual -w @sphere/ui` again and confirm it passes with no updates; open a sample of new PNGs (Button, ContextMenu, Tree, Statusbar, Dialog in both themes) and check them against the spec's principles
- [ ] Update `AGENTS.md`: Frontend Layering gains a "Design system" paragraph (principles in brief, link to the spec, the button primitive rule and the end of the doubled-selector convention, tokens are role-based), a "Storybook" paragraph (`make storybook`, `make storybook-build`, stories next to components as `index.stories.tsx`, Foundations/Compositions under `src/stories/`, the coverage test), and drops the removed `Toolbar`; `IconDisclosure` noted under `@sphere/icons`
- [ ] Full verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build-storybook -w @sphere/ui`, `npm run test:visual -w @sphere/ui`
- [ ] Move this plan to `docs/plans/completed/`
- [ ] Commit: `Remove legacy tokens, regenerate visual baselines and document the design system`
