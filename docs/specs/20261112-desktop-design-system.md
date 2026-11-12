# Desktop design system and Storybook

Redesign `@sphere/ui` so Sphere looks and behaves like a native desktop
application, modelled on the principles of OS X El Capitan (10.11), and give
the component library a Storybook where every component, its variants and the
main app compositions can be inspected.

This is the "separate redesign task" that
`docs/specs/20261025-base-ui-migration.md` prepared: Mantine is gone, every
colour and size already flows through `packages/ui/src/tokens/`, so the look
can now change in one place.

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
- a row's reveal-on-hover affordance (the copy button in `PropertiesViewer`)
  may still appear on row hover, but the button itself has no hover style.

### Cursor

`cursor: default` on every control, row and label. `cursor: text` in editable
text. Resize cursors on split handles and column resizers. Never `pointer`,
never `not-allowed`.

### Corners

Radii are small and depend on what the thing is, not on a single global
value:

| Element                                           | Radius |
| ------------------------------------------------- | ------ |
| Text field, colour well, table, list, tree, panel | 0      |
| Push button, pop-up button, segmented control     | 4px    |
| Tooltip, badge                                    | 3px    |
| Menu, select list, popover, command palette       | 5px    |
| Dialog                                            | 6px    |
| Search field (command palette input)              | pill   |
| Slider knob, colour picker thumb                  | circle |

Selection highlights inside menus and lists have no radius and run edge to
edge of the menu or list.

### Density and type

Compact desktop density on a 4px grid. The system font stack
(`-apple-system, BlinkMacSystemFont, "Segoe UI", …`) at desktop sizes, line
height around 1.3 for running text, controls sized by fixed heights rather
than padding.

| Role                                            | Size | Weight   |
| ----------------------------------------------- | ---- | -------- |
| Statusbar, captions, badges                     | 10px | regular  |
| Section headers (uppercase), field labels, help | 11px | semibold |
| Sidebar rows, panel body, table cells, inputs   | 12px | regular  |
| Menus, buttons, dialog body                     | 13px | regular  |
| Dialog title, panel heading                     | 13px | bold     |

Control heights: `md` 22px (buttons, inputs, selects, segmented controls),
`sm` 18px (statusbar, inline row buttons). Outline rows are 22px. Menu items
are 20px. Glyphs are 14px in `sm`, 16px in `md`.

### Selection

Lists and trees use source-list selection: the selected row is filled
edge to edge with `selection` and its text and glyphs turn `on-accent` while
the list has focus (`:focus-within`); when focus is elsewhere it falls back to
`selection-inactive` with normal text. Glyphs given an explicit colour (the
bulb's layer colour) keep it. No hover tint.

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
  background, hairline `popup-border`, `popup` shadow, 5px radius, 4px
  vertical padding and none horizontal. Items are 13px, 20px tall, padded
  20px left (the check/icon column) and 16px right, shortcut right-aligned in
  the secondary colour. The highlighted item is `selection` with `on-accent`
  text, edge to edge. Separators are a 1px `separator` line with 5px above
  and below. Group labels are 11px secondary.
- **Context menu** opens with its top-left corner at the pointer (0 offset),
  flips and shifts at the window edges with a 4px margin, width fits its
  content with a 160px minimum.
- **Dialog**: `window` background, 6px radius, `window` shadow, 20px padding,
  title 13px bold, body 13px, buttons bottom-right with the primary button
  last. No dimming scrim (the backdrop stays transparent and still blocks
  clicks), no scale animation.
- **Tooltip**: `tooltip` background, hairline border, 3px radius, 11px text,
  no arrow, 700ms delay.

### Colour

Neutral greys, one accent (system blue), semantic status colours. Colour is
for state and data, not decoration. The statusbar and every footer follow the
theme instead of being black in both.

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
| `window`                    | window background, dialogs, statusbar            |
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
| `selection`                 | selected row / highlighted menu item, focused    |
| `selection-inactive`        | selected row when its list is not focused        |
| `focus-ring`                | keyboard focus glow                              |
| `danger`, `warning`, `ok`   | status text and fills                            |
| `scrim`                     | the transparent dialog backdrop (kept a token)   |

### Scales

`scales.ts` is rewritten:

- `space`: 2, 4, 6, 8, 12, 16, 20 (names `xxs`…`xl` or numeric, builder's
  call, applied consistently).
- `radius`: `none` 0, `tooltip` 3, `control` 4, `popup` 5, `window` 6,
  `pill` 999.
- `fontSize`: 10, 11, 12, 13 (see Density and type). Heading sizes beyond
  13px only if a component needs one.
- `lineHeight`: `body` ~1.3, `tight` 1.15.
- `controlHeight`: `sm` 18, `md` 22. `rowHeight`: 22. `menuItemHeight`: 20.
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
| `VisibilityToggle`                        | `IconButton` (glyph, md)                            |
| `StatusbarButton`                         | `IconButton` (glyph, sm)                            |
| `PropertiesTable` pager                   | `IconButton` (glyph, sm)                            |
| `Dialog` close                            | `IconButton` (glyph, md)                            |
| `SectionStack` header, chevrons in `Tree` | primitive (reset only), no press colour             |

No component imports another component's `*.module.css`. The doubled and
tripled selector convention ("R10") is no longer needed and is removed with
the overrides it protected.

`IconButton` API: `appearance: "subtle" | "solid"` is replaced by
`variant: "glyph" | "bordered"` (default `glyph`); `active` keeps its meaning
(toggled on, `aria-pressed`). `StatusbarButton`'s `activeLook` goes: active
is always the accent glyph. The app is updated accordingly.

### Per component

- **Button**: 22px push button, 13px text. `secondary` is the white bordered
  push button, `primary` the accent default button. Pressed darkens. The
  `light` and `subtle` classes used by `ErrorFallback` become `secondary`.
- **IconButton**: see above. `bordered` is a 22px square push-button body
  with the glyph, for toolbars over the map.
- **ActionBar**: a row of glyph buttons with a 2px gap, disabled actions use
  the shared disabled opacity.
- **VisibilityToggle**: glyph button; hidden state uses the tertiary label
  colour for the bulb-off glyph.
- **Tabs**: an NSTabView-style segmented control, centred above the panel,
  22px tall, 12px text; the selected tab is `accent` with `on-accent` text,
  unselected tabs are the bordered control body. No hover.
- **SegmentedControl**: the same look as Tabs, inline. Gains optional icon-only
  options (`icon` + `label` as accessible name) so the map toolbar can use it.
- **Select**: a pop-up button (bordered body, value left, a double chevron
  glyph right). Its list uses the shared menu surface with a checkmark on the
  current value. Search behaviour unchanged.
- **TextField**: square (radius 0) field, `content` background,
  `control-border` hairline, 22px, 12px text, focus ring while focused.
- **ColorField**: a colour well (square swatch in a bordered frame) plus the
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
- **Tree / TreeRow**: 22px rows, 12px text, source-list selection, no hover.
  The chevron is a disclosure triangle (a custom filled-triangle glyph added
  to `@sphere/icons` as `IconDisclosure`, same props as vendor icons).
- **SectionStack**: headers are 22px, 11px semibold uppercase secondary text
  with a disclosure triangle, no background fill, a `separator` line above.
- **Sidebar**: `sidebar` background. Keeps its top inset for the traffic
  lights.
- **Statusbar** and its parts: `window` background with a `separator` line on
  top, 22px tall, 10px text in `label-secondary`. `StatusbarBadge` readouts
  become plain tabular-number text (no black pill); the error badge becomes
  `danger` text. `StatusbarSelect` becomes a small borderless pop-up.
- **PropertiesTable**: `content` background, `separator` grid lines, header
  row in the window colour with 11px semibold labels, column resizer is an
  invisible grip with a resize cursor. Footer follows the statusbar look.
- **PropertiesViewer, AttributeList, InfoRow, PanelBody, Surface, Text,
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
- `IconButton` call sites move from `appearance` to `variant`;
  `StatusbarButton` call sites drop `activeLook`.
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
Controls/      Button, IconButton, ActionBar, VisibilityToggle, SegmentedControl,
               Tabs, Select, TextField, ColorField, SliderField
Menus/         ContextMenu, CommandPalette, Tooltip
Containers/    Dialog, Sidebar, SectionStack, PanelBody, Surface, Split,
               Overlay, AppLayout, Layout (Row, Stack)
Data/          Tree, PropertiesTable, PropertiesViewer, AttributeList, InfoRow,
               Text, Spinner, ImageMarker, ErrorFallback
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
component (`hooks`, `selection`, `tokens`, `ThemeProvider`) are listed as
exempt in the test with the reason. This is how "every component opens in
Storybook" stays true.

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
- Text fields are square (El Capitan), search field is a pill.
- Source-list selection is a solid accent fill, not a tint.
- No dimming scrim behind dialogs.
- The slider's floating value bubble is replaced by an inline value.
- The demo `Toolbar` / `NavbarLink` is deleted.
- Storybook lives in `@sphere/ui` (not a separate workspace package).
