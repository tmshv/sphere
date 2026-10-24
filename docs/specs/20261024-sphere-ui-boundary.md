# Sphere UI boundary

Issue: [#268](https://github.com/tmshv/sphere/issues/268)

Make `@sphere/ui` the only package that knows Mantine exists. The app stops
importing `@mantine/*` and gets all of its UI building blocks from
`@sphere/ui`, through APIs Sphere designs for itself.

This is phase 1 of replacing Mantine with Base UI. Phase 2 rebuilds the
inside of `@sphere/ui` on Base UI, one component at a time, without touching
the app. Phase 2 is out of scope here.

## Problem

Issue #72 asks for a Mantine v5 → v9 upgrade. Mantine 9 needs React 19.2,
sizes everything in `rem`, and has web-page defaults (loose spacing, web
motion). Sphere is a desktop app that should look and behave like one. The
plan is therefore to move to Base UI, which ships no styles, rather than
upgrade.

A move of any kind is expensive today, because Mantine is not contained:

1. **The app imports Mantine directly.** 35 files in `apps/sphere/src`
   import from `@mantine/core`, `@mantine/hooks`, `@mantine/form` or
   `@mantine/spotlight`. A library change would touch every one of them.
2. **`@sphere/ui` exposes Mantine in its public props.**
   - `ActionBarProps` extends `MantineStyleSystemProps` and types
     `tooltipPosition` with Mantine's internal `FloatingPosition`
     (`@mantine/core/lib/Floating`).
   - `StatusbarProps.color` is a `MantineColor`.
3. **`@sphere/ui` only exports large composites** (Sidebar, Outline,
   PropertiesTable…). It has no Button, Select or TextField, so the app
   has nowhere else to go.

## Goals

- No file in `apps/sphere/src` imports `@mantine/*` or `@emotion/*`, and
  lint makes such an import fail.
- `apps/sphere/package.json` no longer lists `@mantine/*` or
  `@emotion/react`.
- No public type exported from `@sphere/ui` refers to a Mantine type.
- The app looks and behaves the same as before, apart from the intended
  changes listed under "Behaviour changes".
- Every new `@sphere/ui` component has tests that query by role, label and
  text, never by Mantine class names or `data-*` attributes, so the same
  tests verify the Base UI rebuild in phase 2.

## Non-goals

- Visual redesign, new design tokens, CSS variables or a desktop look.
  That is phase 2.
- Removing Mantine from `@sphere/ui` internals. Inside `@sphere/ui`,
  Mantine and `createStyles` remain allowed in phase 1.
- Upgrading Mantine, React or `@tabler/icons`.
- Replacing `@tabler/icons`. The app may keep passing tabler icons as
  `ReactNode`s.

## Design rules for the new API

1. **Sphere-owned props only.** No Mantine prop names or value types leak:
   no `sx`, `styles`, `classNames`, `MantineColor`, `MantineSize`, Mantine
   style props (`p`, `mb`, `ml`…), `variant` strings copied from Mantine.
2. **Only what the app uses today.** Every call site uses `size="xs"`, so
   there is no `size` prop on form controls; compact is the only size.
   A prop is added only when a current call site needs it.
3. **Plain DOM escape hatches are allowed** where a call site needs them:
   `className` and `style` on layout components only.
4. **Values in, values out.** Change handlers receive values
   (`onChange(value: string)`), not DOM events.
5. **Composite fields over parts** where every call site combines the same
   parts. For example, all six sliders are wrapped in `Input.Wrapper` with a
   label, so the API is one `SliderField`, not `Field` + `Slider`.
6. **Spacing tokens keep today's pixel values,** so phase 1 changes
   nothing visually. Phase 2 can retune them in one place.

| Token | Pixels | Today's source                      |
| ----- | ------ | ----------------------------------- |
| `xxs` | 2      | literal `spacing={2}`               |
| `xs`  | 4      | `ThemeProvider` override of `xs`    |
| `sm`  | 12     | Mantine 5 default `sm`              |
| `md`  | 16     | Mantine 5 default `md`              |

## New `@sphere/ui` API

All components are function declarations
(`export function Button({ … }: ButtonProps) {}`), as AGENTS.md requires.
The existing `@sphere/ui` components are converted to this form first, so
the package has one style. Each new component replaces the Mantine pieces
listed under it.

### Layout and text

- `Stack` — vertical flex. `{ gap?: Gap; align?: "start" | "center" | "end" | "stretch"; className?; style?; children }`.
  Replaces `Stack`, `Flex direction="column"`, `Box`.
- `Row` — horizontal flex. `{ gap?: Gap; align?: "start" | "center" | "end" | "stretch"; justify?: "start" | "end" | "between"; grow?: boolean; className?; style?; children }`.
  `grow` gives every child equal width. Replaces `Group`, `Flex` (row).
- `Text` — small text. `{ tone?: "default" | "dimmed" | "warning"; weight?: "normal" | "medium" | "semibold"; uppercase?: boolean; style?; children }`.
  `warning` is today's `color="orange"`; `medium` is 500, `semibold` 600.
- `Heading` — panel heading (today's `Title order={3}`, 18px). `{ children }`.
- `Surface` — padded panel background (today's `Paper p="sm"`). `{ style?; children }`.
- `Spinner` — busy indicator (today's `Loader size="xs"`). `{ label?: string }`, default label `"Loading"`, exposed as `role="status"`.

`Gap = "xxs" | "xs" | "sm" | "md"` (pixel values above).

### Controls

- `Button` — `{ variant?: "primary" | "secondary"; type?: "button" | "submit"; disabled?; onClick?; children }`.
  `secondary` is today's `color="gray"`. Default `type` is `"button"`.
- `IconButton` — `{ icon: ReactNode; label: string; onClick; disabled?; active?: boolean; size?: "sm" | "md"; appearance?: "subtle" | "solid" }`.
  `label` is required and becomes `aria-label` and `title`. `active` sets
  `aria-pressed`. `appearance="solid"` with `active` reproduces
  `MapToolbar`'s `variant="filled"`. `size="sm"` is today's `xs`,
  `md` is today's `md`. There is no `radius` or height prop:
  `LayersOutline`'s `radius="sm"` is already Mantine's default, and its
  `h={30}` is dropped (see "Behaviour changes").
- `TextField` — `{ label: string; value: string; onChange(value: string); placeholder?; error?: string; required?: boolean; name?: string; code?: boolean; rightSection?: ReactNode; onBlur?(): void }`.
  `code` turns off autocorrect, autocapitalize and spellcheck (used by the
  filter expression field).
- `Select` — `{ label: string; value: string | null; options: SelectOptions; onChange(value: string | null); placeholder?: string; searchable?: boolean }`.
  `SelectOptions = ReadonlyArray<string | SelectOption>`, reusing the
  existing `SelectOption = { value: string; label: string }`.
- `SegmentedControl` — `{ options: ReadonlyArray<SelectOption>; value: string; onChange(value: string); label: string }`.
  `label` names the group for assistive tech.
- `SliderField` — `{ label: string; value: number; min: number; max: number; step?: number; onChange(value: number) }`.
- `ColorField` — `{ label: string; value: string; onChange(hex: string) }`.
  Label row shows the hex value in a badge, as today.
- `Tabs` — `{ value: string; onChange(value: string); items: ReadonlyArray<TabItem> }`,
  `TabItem = { value: string; label: string; icon?: ReactNode; disabled?: boolean; content: ReactNode }`.
  Only the active item's content is mounted. Carries the current
  `StyledTabs` styles from `LeftSidebar`.
- `Dialog` — `{ opened: boolean; onClose(); title: string; footer?: ReactNode; children }`.
- `ContextMenuItem` — `{ icon?: ReactNode; shortcut?: string; disabled?: boolean; onClick?(); children }`, and
  `ContextMenuLabel` — `{ children }`. Used inside the existing `ContextMenu`.
- `CommandPalette` — `{ commands: ReadonlyArray<Command>; shortcut: string; placeholder: string; emptyMessage: string; children }`,
  `Command = { id: string; title: string; description?: string; icon?: ReactNode; onTrigger(): void }`.
  `onTrigger` is synchronous: async work and its error handling stay in the
  app.

### Statusbar parts

`MapStatusbar` currently builds its own nested `MantineProvider` and
`createStyles` to restyle `ActionIcon` and `Badge`. These move into
`@sphere/ui/Statusbar`:

- `StatusbarButton` — `{ icon: ReactNode; label: string; onClick; disabled?; active?: boolean; activeLook?: "accent" | "fill" }`.
  `label` becomes `aria-label` and `title`; `active` sets `aria-pressed`.
  `accent` (default) is today's yellow icon on the tool buttons and Globe;
  `fill` is today's gray background on the sidebar toggle.
- `StatusbarBadge` — `{ children; title?: string; width?: "auto" | "short" | "long"; tone?: "default" | "error" }`.
  `short` and `long` are today's fixed 90px and 101px widths.

### Hooks

- `useHotkeys(bindings: ReadonlyArray<HotkeyBinding>)` with
  `HotkeyBinding = [string, (event: KeyboardEvent) => void]`. Same key
  syntax as today (`"mod+V"`).
- `useAccentColor(): string` — the colour `SourcesOutline` reads from the
  Mantine theme today (`blue[7]` in light, `blue[5]` in dark).

### Changes to existing exports

- `ActionBar`: drop `MantineStyleSystemProps` and `tooltipPosition`. Add
  `padded?: boolean` for the horizontal `sm` padding two call sites pass.
  The `Tooltip` is hard-coded `disabled` today and never shows, so it is
  removed. Each button gets `aria-label` from `item.label` (today the
  buttons have no accessible name). No `title`, so nothing new appears on
  hover.
- `Statusbar`: drop the unused `color` prop.
- The existing statusbar `Select` (a native `<select>`, unused by the app
  but used by `PropertiesTable` inside `@sphere/ui`) is renamed
  `StatusbarSelect` to free the name for the form `Select`. `SelectOption`
  keeps its name.

## App-side changes

- `useForm` in `SourcesTab` is replaced by local state. The URL field is
  `required`.
- `MapContextMenu` copies the location with the Tauri clipboard plugin
  (`writeText`), as `Spotlight` already does, instead of Mantine
  `CopyButton`. Failures are logged. The Search item stays `disabled`.
- `PhotoLayer/Badge` keeps all its styles, including `textAlign: center`,
  except `transform: "translate(50 %, -50 %)"`. The spaces make that value
  invalid CSS, so browsers ignore it today; it is not carried over.
- `Spotlight` keeps its name and moves to `CommandPalette`. Async commands
  are wrapped so a rejected promise is logged, not dropped.
- The three app files using `createStyles` become plain CSS Modules
  (`properties.tsx`, `PhotoLayer/Badge.tsx`) or move into `@sphere/ui`
  (`MapStatusbar` styles → statusbar parts).
- `LeftSidebar` drops the unreachable `settings` panel; `SidebarTab` is
  only `"sources" | "layers"`, so it can never be shown.
- `PhotoControls` narrows the layout select value with an
  `isPhotoIconLayout` guard instead of relying on Mantine's loose typing.
- The app test wrapper (`apps/sphere/src/test-utils.tsx`) uses
  `@sphere/ui` `ThemeProvider`.

## Behaviour changes

- **Slider tooltips show the value.** Five sliders currently pass the field
  name as Mantine's thumb `label`, so dragging "Radius" shows the word
  "Radius" instead of the number. `SliderField` shows the value, as the
  point radius slider already does.
- **Empty URL is rejected.** Today `useForm` has no validation and the
  field only shows an asterisk, so Submit with an empty field dispatches
  `addFromUrl("")`. The field becomes `required` and an empty or
  whitespace-only URL dispatches nothing and keeps the dialog open.
- **Icon buttons get hover titles.** `IconButton` and `StatusbarButton` set
  `title` from `label`. Today only the Navigation, Select and Info buttons
  have one; the other statusbar buttons, the layer visibility button and the
  layer filter's Clear button gain a native tooltip.
- **Layer visibility button is 28px tall, not 30px.** Its `h={30}` override
  is dropped; the button keeps its 28px width.

## Enforcement

- `@mantine/*` and `@emotion/*` become regular `dependencies` of
  `@sphere/ui` (they were peer dependencies) and are removed from the app.
  `react` and `react-dom` stay peer dependencies.
- A new `apps/sphere/biome.json` extends the root config and restricts
  `@mantine/*` and `@emotion/*` imports with a message pointing at
  `@sphere/ui`. Because npm hoists packages, the import would still
  resolve without this rule.
- `AGENTS.md` "Frontend Layering" states that the app must not import
  Mantine.

## Testing

- AGENTS.md requires tests before changing a file. Every app file this
  work changes that has no test gets a characterization test first, written
  against roles, labels and text, and passing on the Mantine version.
- Layout checks that today live in the app's `StyledTabs` tests (the tabs
  fill the sidebar height without overflowing it) move into the `Tabs`
  tests in `@sphere/ui`, so deleting `StyledTabs` loses no coverage.
- Exception: `App/index.tsx`, `SphereMap/Draw.tsx` and `properties.tsx`
  need a live map or a second window to mount. Their change is a
  mechanical swap of already-tested `@sphere/ui` components, verified by
  typecheck and by running the app.
- Done means: `npm run typecheck`, `npm run lint` and `npm test` pass;
  `rg '@mantine|@emotion' apps/sphere` finds nothing; the app runs and
  every migrated screen is checked by hand.
