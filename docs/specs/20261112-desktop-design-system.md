# Desktop design system and Storybook

Redesign `@sphere/ui` so Sphere looks and behaves like a native desktop
application, modelled on the principles of OS X El Capitan (10.11), and give
the component library a Storybook where every component, its variants and the
main app compositions can be inspected.

This is the "separate redesign task" that
`docs/specs/20261025-base-ui-migration.md` prepared: Mantine is gone, every
colour and size already flows through `packages/ui/src/tokens/`, so the look
can now change in one place.

**Revision after the first review.** The compact El Capitan sizes read too
small, so sizes and paddings go back to what Sphere had before: 30px controls,
rows and section headers, 24px menu items, field and button text inset 10px and
14px, 12px panel insets, and 14px text in menus, tooltips and dialogs. The
statusbar keeps Sphere's own look (a near-black strip with bold uppercase
monospace readouts) in both themes. The sidebar tab list aligns left. The
interaction model (no hover, colour-only press, focus ring, arrow cursor) is
unchanged. A second round then dropped the 3px radius (tooltips and badges use
the control radius), gave text fields and the colour well the control radius,
made the selection a light blue that looks the same with or without focus,
brought back the chevron in trees and section headers, set labels in the
regular weight, gave menus more padding, replaced `VisibilityToggle` with the
generic `IconToggle` (the bulb now lives in the app), added `Kbd`, and merged
`PropertiesViewer` and `InfoRow` into one `PropertyList`. A third
round inset the menu's icon column 8px from the edge, let menu shortcuts be
`KbdShortcut` key caps, and cut dialog padding to the 12px sidebar inset. The
sections below are updated to these values.

## Problem

The Base UI migration reproduced Mantine 5 pixel for pixel, on purpose. The
result still reads as a web page:

- **Tokens are a Mantine copy.** `palette.ts` is Mantine's `DEFAULT_COLORS`,
  `scales.ts` carries Mantine's spacing, `line-height: 1.55`, radii up to
  32px and soft drop shadows. `semantic.ts` has ~90 per-component colours,
  most named after the Mantine file they were lifted from, several with
  accidental values kept for parity (`table-resizer` is the CSS keyword
  `blue`, `table-border` ignores the theme, the statusbar is black in both
  themes).
- **Buttons jump.** `StatusbarButton` and the `PropertiesTable` pager move
  `translateY(1px)` on `:active`. No desktop control moves when pressed.
- **Hover is inconsistent.** `IconButton`, `ActionBar`, `StatusbarButton`,
  `NavbarLink`, the pager, `Button`, `Tabs`, `SegmentedControl` labels and
  tree rows change on hover; `VisibilityToggle` and the `ActionBar` disabled
  state do not. Icon-only buttons are built six different ways (`IconButton`,
  `ActionBar`, `VisibilityToggle`, `StatusbarButton`, the table pager,
  `NavbarLink`), each borrowing another module's classes and overriding them
  with doubled or tripled selectors (the "R10" rule). There is no single
  button primitive, so behaviour drifts.
- **Menus are not native.** `ContextMenu` is a 200px Mantine dropdown: 4px
  inner padding, highlighted items as rounded pills inset from the edge, 14px
  text, a 10px offset from the pointer, a soft web shadow.
- **Corners are web corners.** Radii go 2/4/8/16/32; the Toolbar uses 8, the
  slider 32, badges are pills. Every surface has the same 4px radius whether
  it is a text field, a menu or a dialog.
- **Web interaction habits.** `cursor: pointer` on tabs, segmented controls,
  selects and slider; `cursor: not-allowed` on disabled controls; dialogs dim
  the window with a 75–85% black scrim and pop in with a scale animation; the
  command palette does the same.
- **No way to look at the library.** Components can only be seen inside the
  app or as screenshot baselines. There is no catalogue, no way to try props.
- **The app styles around the library.** `MapToolbar` builds its own floating
  bar with inline styles (`rgba(0,0,0,0.6)`, `borderRadius: 6`).
- **Dead demo code.** `Toolbar` / `NavbarLink` render hard-coded mock links
  ("Dashboard", "Security"…); the app only references it in a comment.

## Goals

1. **One desktop design language** across `@sphere/ui`, following the
   principles below, in light and dark theme.
2. **One button primitive.** Every clickable control in the package is built
   from the same internal primitive and shares one interaction model: no
   hover change, a visible press, a keyboard focus ring, a dimmed disabled
   state. No component composes another component's CSS module.
3. **Native-feeling menus and popups** (context menu, select dropdown,
   command palette, tooltip, dialog).
4. **New tokens.** A neutral macOS-like palette and a small role-based set of
   semantic colours replace the Mantine palette and the per-component colour
   list. Scales (space, radius, type, control height, shadow, duration) are
   rewritten for desktop density.
5. **Storybook** for `@sphere/ui`: `make storybook` from the repo root opens a
   local instance listing every exported component, with Controls for its
   props, a light/dark switch, foundation pages for the tokens, and
   composition stories that assemble whole screens.
6. The app keeps working with no behaviour change; it changes only where the
   package API changes and where it styles around the library today.

## Non-goals

- Native window chrome, vibrancy or blur (Tauri `window-vibrancy`). The
  sidebar gets an opaque sidebar colour instead.
- Platform-specific themes (a Windows or GTK look). One look everywhere,
  modelled on macOS.
- New components the app does not need (checkbox, radio, date picker…).
- Changing app behaviour, Redux state, IPC or the native menu.
- Changing the icon set (Tabler stays, through `@sphere/icons`). Adding a few
  custom glyphs there is allowed (see Disclosure).
- Publishing Storybook anywhere. It runs locally.
- Replacing the screenshot test harness. It stays as the regression net; its
  baselines are regenerated once, for this intended design change.

## Anti-goals

The work fails, even if it technically works, if:

- any control in the package still changes colour, border or size on mouse
  hover (the exceptions are listed under "Hover");
- anything moves when pressed;
- two icon-only buttons with the same role look or react differently;
- a Storybook story shows a component in a state the component cannot reach
  in the app, or fakes data the component would not get (UX principle
  "honest empty state");
- Storybook needs anything beyond `make storybook` to start in a fresh clone
  with dependencies installed.

## Design principles

These are the rules every component follows. They are written so a builder
can decide any case the spec does not list.

### Controls look pressable without hover

A desktop control tells the user it is clickable by how it looks at rest,
not by reacting to the mouse.

- **Bordered controls** (push buttons, pop-up buttons, segmented controls,
  text fields, colour wells) have a light body, a hairline border and, for
  buttons, a hairline bottom shadow. That is their affordance.
- **Borderless glyph buttons** (sidebar action bars, outline row buttons,
  statusbar buttons) draw the glyph in the secondary label colour. Their
  affordance is the glyph itself, placed where toolbars live.
- **Press** changes colour only: a bordered control's body darkens
  (`control-pressed`), a borderless glyph darkens to the primary label colour
  (`glyph-pressed`). The press shows for as long as the button is held.
  Nothing translates, scales or changes size.
- **Toggled on** (`active`): a borderless glyph turns accent-coloured; a
  bordered toggle shows the pressed body with the glyph in accent. The state
  is visible at rest and does not depend on hover.
- **Disabled**: the whole control drops to the disabled opacity
  (`--sphere-opacity-disabled`, 0.35). Cursor stays default.

### Hover

No hover effect on any control. The only things that react to the pointer
are the ones that do on macOS:

- the highlighted item in an open menu, select list or command palette
  follows the pointer (that is keyboard-style highlight, not hover styling);
- resize handles show a resize cursor;
- tooltips appear after a delay (`--sphere-duration-tooltip-delay`, 700ms);
- the copy glyph of a `PropertyList` row is revealed while the pointer is
  over its row (and while it has keyboard focus or shows a copy result); the
  glyph itself has no hover style. This is the one hover reveal, on trial.

### Cursor

`cursor: default` on every control, row and label. `cursor: text` in editable
text. Resize cursors on split handles and column resizers. Never `pointer`,
never `not-allowed`.

### Corners

Radii are small and depend on what the thing is, not on a single global
value:

| Element                                           | Radius |
| ------------------------------------------------- | ------ |
| Table, list, tree, sidebar                        | 0      |
| Push button, pop-up button, segmented control     | 4px    |
| Text field, colour well, key cap, tooltip, badge  | 4px    |
| Panel over the map (`Surface`)                    | 4px    |
| Menu, select list, popover, command palette       | 5px    |
| Dialog                                            | 6px    |
| Search field (command palette input)              | pill   |
| Slider knob, colour picker thumb                  | circle |

Selection highlights inside menus and lists have no radius and run edge to
edge of the menu or list.

### Density and type

Density on a 4px grid, at the sizes Sphere had before the redesign. The system font stack
(`-apple-system, BlinkMacSystemFont, "Segoe UI", …`) at desktop sizes, line
height around 1.3 for running text, controls sized by fixed heights rather
than padding.

| Role                                            | Size | Weight   |
| ----------------------------------------------- | ---- | -------- |
| Statusbar, captions, badges                     | 10px | regular  |
| Section headers (uppercase), field labels, help | 12px | regular  |
| Sidebar rows, panel body, table cells, inputs   | 12px | regular  |
| Buttons, segments, tabs                         | 12px | regular  |
| Menus, tooltips, dialog body                    | 14px | regular  |
| Dialog title, panel heading                     | 14px | bold     |

Control heights: `md` 30px (buttons, inputs, selects, segmented controls,
tabs), `sm` 18px (statusbar, inline row buttons). Outline rows and section
headers are 30px. Menu items are 24px. Glyphs are 14px in `sm` (16px on the
statusbar), 16px in `md`. Text fields and pop-up buttons inset their text
10px, push buttons 14px, segments 12px; the sidebar tab list and panels are
inset 12px.

### Selection

Lists, trees and menus mark the active item with `selection`, a light blue
filled edge to edge, under the plain `label` text. It looks the same whether
or not the list has focus, so the active item never flickers between two
looks. Icons and glyphs keep their own colours on it. No hover tint.

### Focus

Keyboard focus (`:focus-visible`) draws the macOS focus ring: a 3px
`focus-ring` glow outside the control that follows its radius (a
`box-shadow`, not an `outline` with offset). Text fields show the ring
whenever they are focused, by mouse too, as macOS does.

### Motion

Menus and tooltips appear instantly and fade out over `duration-fast`
(120ms). Dialogs and the command palette fade in and out over
`duration-fast`, no scale or translate. Disclosure triangles rotate over
`duration-fast`. `prefers-reduced-motion: reduce` turns every transition off.

### Popups and windows

- **Menu surface** (`ContextMenu`, `Select` list, `CommandPalette`): `popup`
  background, hairline `popup-border`, `popup` shadow, 5px radius, 6px
  vertical padding and none horizontal. Items are 14px, 24px tall, padded
  32px left (an 8px inset, then the 24px check/icon column, so items with and
  without an icon line up) and 20px right, shortcut right-aligned: text in the
  secondary colour, or a `KbdShortcut`. The
  highlighted item is the light blue `selection` with `label` text, edge to
  edge. Separators are a 1px `separator` line with 5px above
  and below. Group labels are 12px secondary.
- **Context menu** opens with its top-left corner at the pointer (0 offset),
  flips and shifts at the window edges with a 4px margin, width fits its
  content with a 160px minimum.
- **Dialog**: `window` background, 6px radius, `window` shadow, 12px padding,
  title 14px bold, body 14px, buttons bottom-right with the primary button
  last. No dimming scrim (the backdrop stays transparent and still blocks
  clicks), no scale animation.
- **Tooltip**: `tooltip` background, hairline border, 4px radius, 12px text,
  no arrow, 700ms delay.

### Colour

Neutral greys, one accent (system blue), semantic status colours. Colour is
for state and data, not decoration. Every footer follows the theme. The
statusbar is the exception: it keeps Sphere's near-black strip in both themes
(see Statusbar below).

## Design tokens

Tokens stay TypeScript in `packages/ui/src/tokens/` and keep emitting CSS
custom properties through `tokensToCss()` with the `--sphere-` prefix, light
on `:root`, dark on `:root[data-theme="dark"]`.

### Palette

`palette.ts` is replaced. The Mantine hues go. The new palette is:

- `gray`: a 13-step neutral ramp from white to black, so both themes draw
  from one ramp;
- system colours with a light and a dark value: `blue`, `red`, `orange`,
  `yellow`, `green`.

Exact values are the builder's, tuned so the light theme reads as El
Capitan (window `#ececec`, content white, accent around `#1a82fb`, selection
around `#1063e0`) and the dark theme as macOS dark (window around `#323232`,
content around `#1e1e1e`). Contrast of text on its surface must meet WCAG AA
(4.5:1) for primary and secondary labels.

### Semantic colours

`semantic.ts` is rewritten as a role-based set. Components use only these.
A component-level token is allowed only where a role is genuinely its own
(the chart bar, the map marker) and it must be defined by reference to a
role or palette value, never as a new literal. The set, at least:

| Token                       | Role                                             |
| --------------------------- | ------------------------------------------------ |
| `window`                    | window background, dialogs                       |
| `content`                   | tables, text fields, lists that hold data        |
| `sidebar`                   | sidebar background                               |
| `popup`                     | menus, select lists, popovers, command palette   |
| `popup-border`              | hairline around popups                           |
| `tooltip`, `tooltip-text`   | tooltip                                          |
| `control`                   | bordered control body at rest                    |
| `control-pressed`           | bordered control body while pressed / toggled on |
| `control-border`            | bordered control hairline                        |
| `control-shadow`            | hairline below push buttons                      |
| `separator`                 | lines between areas, menu separators             |
| `label`                     | primary text                                     |
| `label-secondary`           | secondary text, glyph buttons at rest            |
| `label-tertiary`            | placeholder, captions                            |
| `glyph-pressed`             | borderless glyph while pressed                   |
| `accent`                    | primary button, toggled-on glyph, slider fill    |
| `accent-pressed`            | primary button while pressed                     |
| `on-accent`                 | text and glyphs on accent or selection           |
| `selection`                 | light blue selected row / highlighted menu item  |
| `selection-inactive`        | the skeleton placeholder fill                    |
| `focus-ring`                | keyboard focus glow                              |
| `danger`, `warning`, `ok`   | status text and fills                            |
| `scrim`                     | the transparent dialog backdrop (kept a token)   |
| `statusbar`, `statusbar-*`  | the statusbar strip, its text, glyphs and pills  |

### Scales

`scales.ts` is rewritten:

- `space`: 2, 4, 6, 8, 10, 12, 14, 16, 20 (names `xxs`…`xl` or numeric,
  builder's call, applied consistently).
- `radius`: `none` 0, `control` 4, `popup` 5, `window` 6,
  `pill` 999.
- `fontSize`: `mini` 10, `small` 12, `body` 12, `regular` 14 (see Density
  and type). Heading sizes beyond 14px only if a component needs one.
- `lineHeight`: `body` ~1.3, `tight` 1.15.
- `controlHeight`: `sm` 18, `md` 30. `rowHeight`: 30. `menuItemHeight`: 24.
- `shadow`: `control` (hairline bottom), `popup`, `window`. No others.
- `duration`: `fast` 120ms, `tooltipDelay` 700ms.
- `opacity`: `disabled` 0.35.
- `zIndex` stays.

`tokens/index.test.ts` is updated to the new names and keeps checking that
every semantic colour has both schemes and that the CSS is well formed. Add a
check that every `var(--sphere-…)` used in any `*.module.css` or `global.css`
names a token that exists, so a renamed token cannot silently resolve to
nothing.

### Global CSS

`ThemeProvider/global.css` drops the Mantine normalize copy. It keeps a small
reset inside `@layer sphere-base` (box sizing, body font/colours from the new
tokens, `margin: 0`, form controls inherit font) and adds the global rules
the principles need: `cursor: default` on `button`, and the
reduced-motion switch.

## Components

### The button primitive

A new internal (not exported) primitive in `packages/ui/src/internal/`,
built on Base UI `Button`, owns the interaction model: reset, cursor, focus
ring, press, disabled. It has a shape (`push`, `glyph`) and a size (`sm`,
`md`), expressed as data attributes or classes inside its own module. Every
clickable thing in the package renders through it or through a public
component built on it:

| Component                                 | Built as                                            |
| ----------------------------------------- | --------------------------------------------------- |
| `Button`                                  | primitive, `push`, variants `primary` / `secondary` |
| `IconButton`                              | primitive, `glyph` or bordered, sizes `sm` / `md`   |
| `ActionBar` actions                       | `IconButton` (glyph, md)                            |
| `IconToggle`                              | primitive, `glyph`, two icon/label states           |
| `StatusbarButton`                         | primitive, `glyph`, `sm`, recoloured for the strip  |
| `PropertiesTable` pager                   | `IconButton` (glyph, sm)                            |
| `Dialog` close                            | `IconButton` (glyph, md)                            |
| `SectionStack` header, chevrons in `Tree` | primitive (reset only), no press colour             |

No component imports another component's `*.module.css`. The doubled and
tripled selector convention ("R10") is no longer needed and is removed with
the overrides it protected.

`IconButton` API: `appearance: "subtle" | "solid"` is replaced by
`variant: "glyph" | "bordered"` (default `glyph`); `active` keeps its meaning
(toggled on, `aria-pressed`). `StatusbarButton` keeps `activeLook`: `accent`
(default) is the yellow glyph, `fill` (the sidebar toggle) a grey body behind
the grey glyph.

### Per component

- **Button**: 30px push button, 12px text. `secondary` is the white bordered
  push button, `primary` the accent default button. Pressed darkens. The
  `light` and `subtle` classes used by `ErrorFallback` become `secondary`.
- **IconButton**: see above. `bordered` is a 30px square push-button body
  with the glyph, for toolbars over the map.
- **ActionBar**: a row of glyph buttons with a 2px gap, disabled actions use
  the shared disabled opacity.
- **IconToggle**: a glyph button with two states (`value`), each with its own
  icon and label (`on`, `off`); the off glyph is dimmed to the tertiary label
  colour, an icon with its own colour keeps it. It is not a pressed toggle: it
  never turns accent. The app's outline bulb (`VisibilityToggle` in
  `apps/sphere`) is an `IconToggle` with the bulb icons and Hide / Show.
- **Kbd**: a key cap (control body, hairline border, control shadow, 4px
  radius, 12px secondary text, 18px tall); `KbdShortcut` puts the caps of a
  combination side by side inside one `<kbd>`.
- **Tabs**: an NSTabView-style segmented control, aligned left above the
  panel, 30px tall, 12px text; the selected tab is `accent` with `on-accent` text,
  unselected tabs are the bordered control body. No hover.
- **SegmentedControl**: the same look as Tabs, inline. Gains optional icon-only
  options (`icon` + `label` as accessible name) so the map toolbar can use it.
- **Select**: a pop-up button in the text field's frame (`content`
  background, `control-border` hairline, 4px radius, no shadow), so a select
  and a text field in one form look alike; value left, a double chevron glyph
  right, the body darkens while pressed or open. Its list uses the shared menu
  surface with a checkmark on the current value. Search behaviour unchanged.
- **TextField**: field with the control radius (4px), `content` background,
  `control-border` hairline, 30px, 12px text, focus ring while focused.
- **ColorField**: a colour well (a swatch in a bordered frame with the
  control radius) plus the
  hex field; picker popup uses the popup surface.
- **SliderField**: 4px track (`control-border`-coloured, accent fill), 16px
  white circular knob with hairline border and `control` shadow; no hover or
  drag growth. The current value is shown as text next to the label instead of
  a floating bubble.
- **ContextMenu**: the menu surface above. Adds a `ContextMenuSeparator`
  export.
- **CommandPalette**: Spotlight-like: popup surface, a pill search field,
  results as menu items with edge-to-edge selection, no scrim, fade only.
- **Dialog**: see Popups and windows.
- **Tooltip** (internal): see Popups and windows.
- **Tree / TreeRow**: 30px rows, 12px text, source-list selection, no hover.
  The disclosure is a 14px chevron (`IconChevronRight`) that turns down when
  open, as before the redesign.
- **SectionStack**: headers are 30px, 12px regular uppercase secondary text
  with the same chevron as the tree, no background fill, a `separator` line above.
- **Sidebar**: `sidebar` background. Keeps its top inset for the traffic
  lights.
- **Statusbar** and its parts keep Sphere's own look in both themes: a 28px
  near-black `statusbar` strip with 12px gaps and insets. `StatusbarBadge`
  readouts are 10px bold uppercase monospace `statusbar-text` in an 18px pill
  of the strip colour; the error badge is a `statusbar-error` red pill.
  `StatusbarButton` glyphs are 16px `statusbar-glyph` grey, light while
  pressed, `statusbar-glyph-active` yellow when toggled on, or on a
  `statusbar-fill` body with `activeLook="fill"`; no hover, nothing moves.
  `StatusbarSelect` is a 16px white `statusbar-field` pill with the value in
  the readout type and a small chevron. These roles have the same value in
  both themes and are in `tokens/contrast.test.ts`.
- **PropertiesTable**: `content` background, `separator` grid lines, header
  row in the window colour with 12px semibold column labels, column resizer is an
  invisible grip with a resize cursor. Footer follows the statusbar look.
- **PropertyList**: the one component for name and value pairs: feature
  properties in the panel over the map, source details, and the statistics
  of an attribute. A `<dl>` on a two-column grid: names left-aligned in the
  secondary colour, the name column as wide as the longest name up to 45%,
  every value starting on the same column after it. Long names and values
  wrap, never ellipsize. Lines are 18px, the small glyph button's height.
  Each row is a subgrid spanning both columns, so it has a box of its own.
  `copyable` (default on) adds a copy glyph closing every row, revealed on
  row hover, which turns into a check with a "Copied!" tooltip, and a
  right-click menu: Copy Value, Copy Name, Copy Name and Value
  (`name: value`). `checkUrls` shows a URL value as its image. It replaces
  `PropertiesViewer` and `InfoRow`.
- **AttributeList, PanelBody, Surface, Text,
  Layout, Overlay, Spinner, ErrorFallback, ImageMarker, Badge, Skeleton,
  Split, AppLayout**: retoken onto the new roles and scales; no structural
  change unless a principle requires it. `Split` uses `separator` for its
  sash and `accent` for the focused sash.
- **Toolbar / NavbarLink**: removed from the package (export, folder, tests,
  baselines) and the commented-out reference in `apps/sphere`.

### App changes

- `MapToolbar` drops its inline styles and renders the tools as an icon-only
  `SegmentedControl` (or a bordered `IconButton` group, builder's call) from
  `@sphere/ui`, positioned by a small wrapper that only sets position.
- `IconButton` call sites move from `appearance` to `variant`.
- Any other app code that styles around the library to look right is moved
  into the library or deleted. `RectSelectOverlay`, `Draw` and `PhotoLayer`
  inline styles that only position things may stay.

## Storybook

### Setup

- Storybook 10 with the `@storybook/react-vite` framework, installed as dev
  dependencies of `@sphere/ui` only. Pin exact versions released at least two
  weeks before installation (`npm view storybook time`); at spec time that is
  `10.6.5` (2026-10-27). Use the essentials
  that ship in Storybook core (Controls, Actions, Docs, Backgrounds off,
  Viewport) plus `@storybook/addon-docs` for autodocs and MDX.
- Config in `packages/ui/.storybook/` (`main.ts`, `preview.tsx`), stories
  globbed from `packages/ui/src/**/*.stories.tsx` and
  `packages/ui/src/**/*.mdx`.
- `packages/ui/package.json` gets `"storybook": "storybook dev -p 6006"` and
  `"build-storybook": "storybook build"`.
- A root `Makefile` with a `storybook` target that runs
  `npm run storybook -w @sphere/ui` (opening the browser), and a
  `storybook-build` target. If `node_modules` is missing the target runs
  `npm ci` first. `.PHONY` declared.
- `storybook-static/` and Storybook's cache are git-ignored.
- `preview.tsx`: a `theme` global (light / dark) in the toolbar, a decorator
  that wraps every story in `ThemeProvider` with that theme, `layout:
  "centered"` by default, `fullscreen` for compositions. The Storybook UI
  itself follows the chosen theme where cheap (manager theme), not required.
- Stories obey the repo rules: Biome lint and format, no `any`, no `!`, no
  `as` casts, no magic numbers, `function` components. Story files are
  type-checked by `npm run typecheck -w @sphere/ui`.
- Unit tests and visual tests ignore story files.

### Story structure

The sidebar is organised as:

```
Foundations/   Principles (MDX), Colors, Typography, Spacing, Radius, Shadows
Controls/      Button, IconButton, IconToggle, ActionBar, SegmentedControl,
               Tabs, Select, TextField, ColorField, SliderField
Menus/         ContextMenu, CommandPalette, Tooltip
Containers/    Dialog, Sidebar, SectionStack, PanelBody, Surface, Split,
               Overlay, AppLayout, Layout (Row, Stack)
Data/          Tree, PropertiesTable, PropertyList, AttributeList, Text, Kbd,
               Spinner, ImageMarker, ErrorFallback
Statusbar/     Statusbar, StatusbarButton, StatusbarBadge, StatusbarSelect
Compositions/  Main window, Sources sidebar, Layer inspector, Properties window,
               Context menu on tree, Dialog over window, Command palette
```

- **Foundations** pages render from the token TypeScript objects (not
  copied values), so they cannot drift: swatches per semantic colour in both
  themes, the type ramp, space/radius/shadow samples. `Principles.mdx`
  summarises the design principles of this spec.
- **Component stories** (artboards): one file per component folder,
  `index.stories.tsx`, with `tags: ["autodocs"]`, `component` set, `args` for
  every prop with a sensible default, `argTypes` for unions (select / radio
  controls), callbacks as `fn()` from `storybook/test` so they show in
  Actions. A `Default` story driven by Controls, plus named stories for each
  meaningful state (disabled, active, error, empty, loading, long text…).
  Where a state only shows on press or focus (the press colour, the focus
  ring), a story renders it by a `play` function or by a static "States"
  sheet that lays all states side by side.
- **Each component also gets a "Gallery" story** (where it has more than one
  variant): every variant × size × state on one artboard, in the current
  theme, for side-by-side review.
- **Compositions** assemble real screens from the package only (no app
  imports, no Redux, no Tauri, no maplibre): a map placeholder area, the
  left sidebar with Sources/Layers tabs, action bar, source tree with
  folders and source-layers, a section stack with a layer inspector (select,
  slider, colour field, text field), the statusbar, a properties table window,
  a context menu open over a tree row, a dialog open over the window, the
  command palette open. Fixture data lives in
  `packages/ui/src/stories/fixtures.ts` and is plausible GIS data.

### Coverage check

A unit test (`packages/ui/src/stories/coverage.test.ts`) reads
`packages/ui/src/index.ts`, resolves every exported component folder, and
fails if the folder has no `index.stories.tsx`. Folders that export no
component (`hooks`, `selection`, `ThemeProvider`) are listed as exempt in
the test with the reason; the test also fails if an exemption names a folder
the barrel does not export. `tokens` is not exported, so it needs none.
This is how "every component opens in Storybook" stays true.

## Testing

- Unit tests that pinned Mantine parity (`declaredStyle(...cursor)` "as the
  app's global rule did", "no press transform as Sphere's theme set
  activeStyles to none", etc.) are rewritten to pin the new principles: cursor
  default, no transform on `:active`, no background change on `:hover` for
  every button-like component (one shared helper, applied to each).
- New API (`IconButton` `variant`, icon-only `SegmentedControl` options,
  `ContextMenuSeparator`, `IconDisclosure`) is test-first.
- Visual tests keep their cases (minus Toolbar) and add cases for new states
  (pressed, toggled on, selection focused/unfocused, menu separator). The
  baselines are regenerated once, on macOS (`webkit-darwin`), as the intended
  design change, after the redesign is complete. Hover cases are kept and
  must now look identical to the rest state.
- `npm run lint`, `npm run typecheck`, `npm test` and
  `npm run build-storybook -w @sphere/ui` pass. `npm run build` passes.

## Documentation

- `AGENTS.md`: the Frontend Layering section describes the design principles
  in short (link to this spec), the button primitive rule (no cross-module
  CSS composition, the R10 rule is gone), Storybook (`make storybook`, where
  stories live, the coverage test) and the removed Toolbar.

## Left to the builder

- Exact palette values and dark-theme tuning, within the contrast rule.
- Token naming details inside the groups above.
- Whether `MapToolbar` uses `SegmentedControl` or a bordered `IconButton`
  group.
- Story-by-story choice of which states deserve a named story.
- How the press colour is shown in a static story.

## Calls made without the user

The user asked to proceed without questions and review at the end, so these
were decided in the spec rather than asked:

- El Capitan principles applied to both themes; dark theme modelled on later
  macOS dark mode, since El Capitan had none.
- Text fields share the control radius, search field is a pill.
- Selection is a light blue tint under plain text, the same with or without
  focus.
- No dimming scrim behind dialogs.
- The slider's floating value bubble is replaced by an inline value.
- The demo `Toolbar` / `NavbarLink` is deleted.
- Storybook lives in `@sphere/ui` (not a separate workspace package).
