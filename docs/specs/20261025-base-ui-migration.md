# Base UI migration

Issue: [#72](https://github.com/tmshv/sphere/issues/72)

Rebuild every `@sphere/ui` component on Base UI (`@base-ui/react`) and CSS
Modules, driven by Sphere's own design tokens, and remove Mantine and Emotion
from the repository. The app must look exactly as it does today.

This is phase 2. Phase 1 (`docs/specs/20261024-sphere-ui-boundary.md`, PR
#269) made `@sphere/ui` the only package that imports Mantine, so this work
does not change the app's code except where noted.

## Problem

`@sphere/ui` still renders through Mantine 5.10.5: 41 source files import
`@mantine/core`, `@mantine/hooks` or `@mantine/spotlight`, and most style
through `createStyles` (Emotion, runtime CSS-in-JS). Mantine 5 is three majors
behind, and the current major (9) needs React 19.2, sizes in `rem` and brings
web-page defaults. Sphere is a desktop app that wants px sizing, compact
density and full control over look and behaviour.

## Goals

- No `@mantine/*` or `@emotion/*` package in any `package.json` or
  `package-lock.json`, and no import of them anywhere in `apps/` or
  `packages/`.
- **No visual change.** Every component and every screen looks the same as
  on the Mantine version, in light and dark theme, proven by screenshot
  comparison against a baseline captured before migration starts.
- One source of truth for design tokens, with light and dark themes, used
  by every component. This prepares the separate redesign task.
- The public API of `@sphere/ui` stays as phase 1 left it. The app changes
  only where this spec says so.

## Non-goals

- Any visual or interaction redesign, including fixing visuals that look
  wrong today (see "Preserve effective rendering").
- Upgrading React or `@tabler/icons`.
- Theming beyond light and dark.

## Design tokens

### Structure

Tokens are written in TypeScript in `packages/ui/src/tokens/` and are the
only place a colour, size or font value is defined.

- **Palette** — raw colours copied verbatim from Mantine 5's
  `DEFAULT_COLORS` (`@mantine/styles/esm/theme/default-colors.js`) for the
  hues Sphere uses (`dark`, `gray`, `blue`, `red`, `yellow`, `orange`, plus
  any other hue found during migration), and `white` `#fff`, `black` `#000`.
  Ten shades per hue, `0`–`9`.
- **Semantic colours** — named by role, each with a light and a dark value
  that points into the palette. Components use semantic colours only, never
  the palette directly. This is what lets the redesign change the look in
  one place.
- **Scales** — space, radius, font size, font family, line height, font
  weight, shadow, z-index and transition duration.

A function turns the tokens into CSS custom properties: light values on
`:root`, dark values on `:root[data-theme="dark"]`. Names follow
`--sphere-<group>-<name>` (`--sphere-color-text`, `--sphere-space-sm`).
Components read tokens only through these variables in their CSS Modules.

TypeScript code that must have a concrete value (a tabler icon `color` prop
is an SVG attribute and cannot use `var()`) reads it from the tokens and the
current scheme. `useAccentColor` is the only such case today.

### Scales

Values match what renders today: Mantine 5 defaults with Sphere's
`ThemeProvider` overrides (`spacing.xs` = 4, `spacing.xl` = 28, `h3` = 18,
no active-press transform).

| Group       | Tokens and values                                                       |
| ----------- | ----------------------------------------------------------------------- |
| space       | `xxs` 2, `xs` 4, `sm` 12, `md` 16, `lg` 20, `xl` 28                     |
| radius      | `xs` 2, `sm` 4, `md` 8, `lg` 16, `xl` 32                                |
| font size   | `xs` 12, `sm` 14, `md` 16, `lg` 18, `xl` 20                             |
| line height | `body` 1.55                                                             |
| font family | `sans` = Mantine `fontFamily`, `mono` = Mantine `fontFamilyMonospace`   |
| shadow      | `xs`–`xl` copied from Mantine `shadows`                                 |

Phase 1's `GAP_PX` stays exported and is derived from the space scale.

### Semantic colours (starting set)

| Token          | Replaces                                       |
| -------------- | ---------------------------------------------- |
| `body`         | body background: `white` / `dark.7`            |
| `text`         | body text: `black` / `dark.0`                  |
| `text-dimmed`  | `color="dimmed"`: `gray.6` / `dark.2`          |
| `accent`       | primary filled background: `blue.6` / `blue.8` |
| `accent-icon`  | `useAccentColor`: `blue.7` / `blue.5`          |
| `focus-ring`   | focus outline: `blue.5` / `blue.7`             |
| `danger`       | statusbar error badge: `red.8`                 |
| `warning-text` | `Text tone="warning"` (Mantine `orange`)       |

The set grows during migration. Rule: when a component uses a colour, map
it to an existing semantic token if that token has the same value in both
themes and the same role; otherwise add a token named for its role
(`input-border`, `tab-active-bg`, `statusbar-text`). Never name a token
after a value (`gray-8`).

## Theme provider and global styles

`ThemeProvider({ dark, children })` keeps its signature. It:

- writes the token CSS once into the document,
- sets `data-theme="light" | "dark"` and `color-scheme` on `<html>`, so
  portalled popups (dialogs, menus, tooltips) get the right theme,
- provides the current scheme through React context (for `useAccentColor`),
- applies global styles equal to what Mantine's `withGlobalStyles` and
  `withNormalizeCSS` render today: `box-sizing: border-box` on everything,
  the Mantine 5 normalize rules, and the body font, size, line height,
  colour, background and font smoothing.

## Components

Each component keeps its phase 1 props. Internals change as follows.

- **Styling:** CSS Modules only. No inline style objects except values
  computed at runtime (positions, sizes from props). `createStyles`, `sx`,
  `styles` and Emotion `cx` go away.
- **Behaviour:** Base UI where it has the component; plain elements where
  the component is only visual.

| Component                      | Built on                                         |
| ------------------------------ | ------------------------------------------------ |
| Text, Heading, Surface         | plain elements                                   |
| Spinner                        | inline SVG (Mantine's oval loader) + CSS         |
| Button, IconButton             | Base UI `Button`                                 |
| TextField                      | Base UI `Field` + `Input`                        |
| Select                         | Base UI `Select`; `Combobox` when `searchable`   |
| SegmentedControl               | Base UI `ToggleGroup` + `Toggle`                 |
| SliderField                    | Base UI `Field` + `Slider`                       |
| ColorField                     | `react-colorful` `HexColorPicker`                |
| Tabs                           | Base UI `Tabs`                                   |
| Dialog                         | Base UI `Dialog`                                 |
| ContextMenu and items          | Base UI `Menu`, anchored to a virtual point      |
| CommandPalette                 | Base UI `Dialog` + `Autocomplete`                |
| Tooltips (internal)            | Base UI `Tooltip`                                |
| Badge, Skeleton (internal)     | plain elements                                   |
| `useHotkeys`                   | own `keydown` listener, same key syntax          |
| Layouts and composites         | plain elements + the components above            |

Layouts and composites are `Row`, `Stack`, `AppLayout`, `Sidebar`,
`Split`, `PanelBody`, `SectionStack`, `Statusbar` (+ parts), `Toolbar`,
`Overlay`, `ActionBar`, `AttributeList`, `InfoRow`, `Outline`,
`OutlineItem`, `ErrorFallback`, `ImageMarker`, `PropertiesViewer` (+
`CopyButton`) and `PropertiesTable`.

Internal building blocks (Badge, Skeleton, Tooltip, unstyled button
reset) are shared inside `@sphere/ui` and not exported unless the app
already needs them.

### Matching Mantine's look

Each component's CSS is ported from Mantine 5's own styles for the variants
and sizes Sphere actually uses
(`@mantine/core/esm/<Component>/<Component>.styles.js`), with Mantine's
theme lookups replaced by tokens. Transitions copy Mantine's default kind
and duration for each popup. Places that set a duration explicitly (the
`ActionBar` tooltip uses 0) keep it.

### Preserve effective rendering

Some current styles are invalid or have no effect. For example,
`Statusbar` sets `backgroundColor: theme.colors.dark`, an array, which the
browser ignores. The migration reproduces what the screen shows, not what
the code meant. Each such case is listed in the PR description as input for
the redesign task.

## Visual parity

- A visual test suite in `packages/ui` renders every component in each
  state it is used in (default, hover, focus, active, disabled, error,
  open popup), in light and dark theme, and compares a screenshot of each.
- It runs in Vitest browser mode with Playwright's WebKit engine, the same
  engine as the Tauri webview on macOS, through its own config and npm
  script. It runs locally on macOS, not in CI, because font rendering
  differs across platforms.
- **Baselines are captured from the Mantine version before any component
  changes,** and committed. Every later task must pass them unchanged.
  Updating a baseline is allowed only for differences of a few
  anti-aliased pixels, with a per-test tolerance and a comment explaining
  it, never to accept a real change.
- The app is checked by hand at the end in light and dark theme.

## Enforcement

- `packages/ui/biome.json` restricts `@mantine/**` and `@emotion/**`, like
  `apps/sphere/biome.json` already does.
- `AGENTS.md` describes `@sphere/ui` as Base UI + CSS Modules with design
  tokens, and lists `@base-ui/react` under "Key Dependencies" in place of
  Mantine.

## Dependencies

- Added to `@sphere/ui` `dependencies`: `@base-ui/react` `^1.9.0` and
  `react-colorful` `^5.8.1`. Base UI's `date-fns` peer dependencies are
  optional and not needed.
- Added as dev dependencies of `@sphere/ui`: `@vitest/browser-playwright`
  (same version as the installed `vitest`, 4.1.4) and `playwright` (a
  release at least two weeks old).
- Removed everywhere: `@mantine/core`, `@mantine/hooks`,
  `@mantine/spotlight`, `@emotion/react`.

## Testing

- Existing unit tests (happy-dom) must keep passing. Phase 1 wrote them
  against roles, labels and text, so they should not need changes. Any that
  relied on Mantine markup are rewritten by role or label.
- The `@sphere/ui` test wrapper (`test-utils.tsx`) uses `ThemeProvider`.
- New behaviour Mantine provided for free gets a unit test where Sphere now
  owns it: `useHotkeys` key parsing, `ContextMenu` positioning at a point,
  `CommandPalette` filtering and keyboard selection, token CSS generation.
- Done means: `npm run typecheck`, `npm run lint`, `npm test`, the visual
  suite and `npm run build` pass; `rg '@mantine|@emotion' apps packages`
  finds nothing; the app is checked by hand.
- The PR reports the JS and CSS bundle sizes from `npm run build` before
  and after.
