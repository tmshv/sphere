# Base UI migration notes

## Bundle size before

`npm run build` at the repo root (Vite 8.0.8), before any migration change:

| File                                       | Size        | Gzip      |
| ------------------------------------------ | ----------- | --------- |
| dist/assets/main-Coo5wVAD.js               | 1,450.88 kB | 392.92 kB |
| dist/assets/main-DEnxIXyA.css              | 75.88 kB    | 11.36 kB  |
| dist/assets/properties-Q8s1UkTr.js         | 720.20 kB   | 213.19 kB |
| dist/assets/properties-BzthCKhA.css        | 6.00 kB     | 1.24 kB   |
| dist/assets/maplibre-gl-worker-BT8N07F-.js | 517.39 kB   | n/a       |
| dist/assets/maplibre-gl-DxhH1qqv.js        | 2.51 kB     | 1.12 kB   |
| dist/assets/rolldown-runtime-XQCOJYun.js   | 0.68 kB     | 0.41 kB   |

## Visual baselines

- Baselines are `webkit-darwin` only, by design: one browser and one platform keep them deterministic. They are not expected to match on Linux CI.

## No visual difference (preserved as rendered)

- Tabs: no hover style exists (tabs are `unstyled`, only focus styles are set), so hovering a tab renders the same as not hovering. No hover case; the new Tabs must not add one.
- Tabs: the disabled tab is part of every Tabs case, so `first-active` already pins it; no separate case.
- IconButton: `active` with the default `subtle` appearance only sets `aria-pressed`; it renders identically to inactive. Only `appearance="solid"` with `active` changes the look. The new IconButton must not add a subtle-active style.
- The app uses no disabled or error `Select` and no disabled `SliderField`, so none are covered.
- Text: an unset `weight` renders identically to `weight="normal"` (no weight style applied, the inherited 400 is used), so only `normal` is covered.
- Outline: `draggable` renders identically to the plain list (the drag wrapper only sets `opacity: 1`), so only the plain list is covered. The new Outline must not add a visible difference for `draggable`.
- ThemeProvider: `packages/ui/src/ThemeProvider/global.css` keeps Mantine 5's misspelled `kbp` selector (meant `kbd`) verbatim, because it reproduces what renders today.

## Buttons and form controls (Task 5)

### No visual difference (preserved as rendered)

- Button and IconButton: Mantine's `&:active { transform: none }` (from `theme.activeStyles`) is a no-op, so no active-state style is added. The `loading` styles are never used by Sphere and are not ported.
- Button and IconButton: a disabled control keeps `pointer-events: none`, so it shows no hover style, as before.
- IconButton: `appearance="solid"` with `active` renders Mantine's filled gray (same colours as the secondary Button). Every other combination renders subtle gray.
- Select: the text input is `type="search"` in Mantine; its `::selection` and search decorations have no visible effect on a read-only value, so nothing is ported for them. The clear button is never rendered because `clearable` is off.
- Select: a search that matches nothing shows no dropdown (Mantine hides it when no "nothing found" text is set). The new Select hides the empty popup with `.dropdown[data-empty]`.
- Select and TextField: error colour, invalid border and placeholder colour are ported but `Select` has no `error` prop, so only `TextField` shows them.

### Differences in behaviour, not in pixels

- SegmentedControl: built on Base UI `RadioGroup` + `Radio`, not `ToggleGroup` + `Toggle` as the spec lists. `ToggleGroup` moves focus with the arrow keys but only selects on Space or Enter, while Mantine's native radios select as the arrow moves. `RadioGroup` keeps that (and the `radiogroup` / `radio` roles). The sliding indicator and the colour transitions are not reproduced: the active segment is drawn directly on its control, which is what Mantine renders before its first change.
- Select: a Base UI `Select` is a button trigger (`role="combobox"`), not an input. Tests read its text content; the searchable variant is a `Combobox` input and keeps `toHaveValue`.
- Tooltip: Base UI also opens a tooltip on keyboard focus; Mantine opened on hover only (`events.focus: false`). The `arrow` prop mirrors Mantine's `withArrow` for `PropertiesViewer/CopyButton`.
- Tooltip: Mantine positions the tooltip at fractional pixels, Base UI rounds to whole pixels. The box is identical and only the glyph anti-aliasing differs (about 100 pixels), so the Tooltip visual cases allow a 0.05% pixel mismatch, with a comment in the test.

## SliderField and ColorField (Task 6)

### No visual difference (preserved as rendered)

- SliderField: the value label shows while the pointer is over the 4px track (Mantine's track `mouseenter`), while dragging, and on keyboard focus only. Hovering the 8px-high slider row outside the track shows nothing, as before. The 8px thumb has a 4px border, so it renders as a solid disc (accent in light, white in dark).
- SliderField: the filled bar starts 4px left of the track and ends under the thumb centre, as Mantine's bar does (`left: -4px`, `width: calc(value% + 4px)`).
- ColorField: Mantine paints the colour area 5px past the box the thumb moves in (overlays at `inset: -5px`) and offsets the picker by its 1px padding. The new picker keeps this geometry, with the library's measured element inset by 5px inside the painted area.
- ColorField: the hue gradient keeps Mantine's `hsl(170, ...)` stop (not 180) and its inset box-shadow.
- ColorField: hue, saturation and value are whole numbers and the hex is built from them, so the reported hex matches Mantine's. This needs `HsvColorPicker` plus small converters (`ColorField/hex.ts`), not `HexColorPicker`, whose HSV state is not rounded.

### Differences in behaviour, not in pixels

- SliderField: Base UI renders a native `<input type="range">` inside the thumb, so tests read `min`, `max` and value from it instead of `aria-valuemin`, `aria-valuemax` and `aria-valuenow`. It is visually hidden, so the thumb-hover visual case hovers the visible thumb element.
- SliderField: pressing ArrowRight at max no longer calls `onChange(max)` again. Base UI reports changes only, where Mantine repeated the clamped value.
- ColorField: `react-colorful` handles arrow keys through `keyCode`, so tests that fire key events on its sliders must pass `keyCode`.
- Colour math is exempt from the token rule, as functional rather than design: the saturation area's black and white gradient stops and the hue spectrum `hsl()` stops stay literal in `ColorField/color-field.module.css`. Theme colours (thumb shadow, hue ring and glow) are tokens, and Mantine size-table geometry is a named local custom property with a comment citing its source.
- Tabs: Mantine `unstyled` dropped UnstyledButton's `padding: 0`, so every tab renders with the browser's default button padding (1px 6px). Kept as rendered; the CSS Module sets no padding on `.tab`.
- Tabs: Base UI keeps disabled tabs in the arrow-key order (`aria-disabled`, no `disabled` attribute), where Mantine skipped them. The list handles Arrow/Home/End itself over the enabled tabs, and `activateOnFocus` keeps Mantine's select-on-arrow behaviour.
- Dialog: Mantine's close button had no accessible name; the Base UI one is labelled "Close". Mantine's Modal `size` is fixed at `md` (440px) and `centered`; the overlay fade is half the 250ms `pop` duration.
- ContextMenu / CommandPalette: Mantine's normalize.css gives every `button` `line-height: 1.15`, so menu items and palette actions (buttons in Mantine, divs in Base UI) set that line height themselves; a text-only menu row is 24.1px tall because of it.
- ContextMenu: Mantine 5 shifts and flips with floating-ui and no collision padding, so the menu may touch the window edge. The Base UI positioner sets `collisionPadding` 0 and `collisionAvoidance` `{ side: "flip", align: "shift" }` to match. Base UI rounds the popup position to a whole pixel where Mantine kept the fraction, so the `near-edge` visual case allows 0.0005 of the pixels to differ (about 90, shortcut text and trash icon anti-aliasing).
- CommandPalette: Mantine's Spotlight overlay is black at .25 under a 3px backdrop blur (not the Modal overlay), the popup sits 120px from the top, 600px wide, and its `pop` transition lasts 150ms (the overlay fade 75ms). `margin-left: calc(var(--removed-scroll-width, 0px) * -1)` on the popup is a no-op without Mantine's scroll lock and is not reproduced.
- CommandPalette: the search input takes `autoFocus`. Base UI's dialog focus manager moves focus to the input a tick after mount, and keystrokes sent in that gap were lost; Mantine's focus trap had no such gap in the visual harness.

### Hotkey and palette behaviour matched to Mantine 5.10.5

- `useHotkeys` (was `@mantine/hooks`): keydown on `document.documentElement`; INPUT, TEXTAREA and SELECT targets and contentEditable targets are ignored; `preventDefault()` always runs for a handled key; `mod` accepts Ctrl or Cmd on any platform; a hotkey without `mod` fires only while neither is held; Shift and Alt must match exactly; the key matches `event.key` (lower-cased) or `event.code` without its "Key" prefix, so a Cyrillic layout still fires `mod+V`. `parseHotkey` has no `ctrl` or `meta` tokens (Sphere does not use them), where Mantine's does.
- CommandPalette shortcut: Mantine's `SpotlightProvider` registers its shortcut through the same `useHotkeys` with the default `tagsToIgnore` (INPUT, TEXTAREA, SELECT) and `triggerOnContentEditable` false, and its handler is `open`, not toggle. The palette therefore does the same: it opens from anywhere except inside a text field, it never closes on a second press, and the browser default of the key is prevented. This is where the Review Focus line "mod+P opens from anywhere" yields to Mantine parity.
- CommandPalette selection: Mantine starts with nothing hovered (index -1); the first typed character selects the first result only when nothing was selected, and the index is then clamped, so after arrowing to item 3 and typing, the highlight stays near 3. Base UI `autoHighlight` instead re-highlights the first match on every input change (Autocomplete has no controlled highlight to reproduce Mantine's rule). This is a known difference. Everything else matches: ArrowDown from nothing selects the first, ArrowUp from nothing the last, both wrap, Enter with nothing selected does nothing, Escape closes at once even with a query, and the pointer leaving the list clears the selection.
- ContextMenu: Mantine's arrow keys skip disabled items; Base UI menu items stay focusable when disabled. A disabled `ContextMenuItem` is rendered as a plain `role="menuitem"` `aria-disabled` element outside Base UI's item list, with the same class, so it is skipped by the arrow keys and looks the same.
- CommandPalette filter: Mantine's default `filterActions` (case-insensitive substring of the trimmed query; title matches first, then description matches), at most 10 results, and the "nothing found" text only for a non-blank query. The query clears when the palette finishes closing; a command closes the palette after it runs.
- Sidebar: Mantine `Flex pt="xl" p={0}` renders with padding-top xl (the later `p={0}` does not win); the CSS Module keeps padding-top xl, confirmed by the unchanged baseline.
- Statusbar and StatusbarBadge: `backgroundColor: theme.colors.dark` is an array. Emotion writes one declaration per entry, so the browser keeps the last one, dark[9] (#101113), in both schemes. It is not dropped as invalid: the bar and the default badge render near-black, confirmed by the unchanged baselines. The CSS Module reproduces that fill through the `statusbar-bg` token.
- Toolbar: the nav class sets `height: 100%` and `width: auto`, so Navbar's own `calc(100vh - header)` height and `100%` width never show; the plain `nav` keeps only the box that renders (flex column, border-box, body background, md radius, the literal #f0f0f0 / #0f0f0f border, sm padding).
- AttributeList FieldRow: the type badge is Mantine `Badge size="xs" radius="sm"` with the default `light` variant and `style={{ flexShrink: 0 }}`, so the internal Badge needed no extension; the style became a class.
- ErrorFallback: Mantine `Button` variants `light` and `subtle` (size xs) are not offered by the public Button, whose props stay as they are. `Button/button.module.css` carries them as internal-only classes (`.light`, `.subtle`, not in `ButtonVariant`) with new `button-light-*` and `button-subtle-hover` tokens; ErrorFallback composes `.button` plus the variant class on a Base UI `Button`. Mantine's `Group` wraps, so the row sets `flex-wrap: wrap`.
- ErrorFallback: Mantine `Text` sizes `sm` and `lg` and `lineClamp={3}` are inline styles on the rebuilt Text, which only renders size xs.
- PropertiesViewer: Mantine `Image` (width 120, height 120, fit cover, radius 0) is a root box, figure, relative wrapper and `img` (block, border 0, object-fit cover); its `fontStyles()` (font family and smoothing) have no effect on an image and are not reproduced. The `img` now has `alt` set to the property key; Mantine rendered none.
- PropertiesViewer CopyButton: Mantine `ActionIcon` had no accessible name; the button now has `aria-label` equal to its tooltip text ("Copy" / "Copied!"). The copy-button and copy-tooltip visual cases allow 0.001 of the pixels to differ: Base UI rounds the tooltip position to a whole pixel where Mantine kept the fraction of the table cell.
- ImageMarker: the class's `width: 24; height: 24` are always overridden by the inline `size`, so the CSS Module sets neither.
- OutlineItem: Mantine `Center w={30} h={30}` is a flex-centred 30px box. The item button's overrides of `.unstyledButton` are doubled (`.button.button`) to win by specificity (R10).
- R10 follow-ups: `statusbar-button.module.css`, `toolbar.module.css`, `icon-button.module.css` and `button.module.css` win over `.unstyledButton` by doubled classes, not by stylesheet order.
- R10 audit: every module that composes `.unstyledButton`, `.iconButton`, `input.module.css` or the internal Badge wins by specificity. Doubled against single-class shared rules: Button, icon-button, Toolbar, OutlineItem, SectionStack header, Select trigger (against `.input`), StatusbarBadge (against Badge). Against the doubled `.iconButton` rules (0,2,0 base, 0,3,0 disabled): Dialog `.close` is tripled, ActionBar `.bar .action.action` is (0,3,0) and its disabled rule (0,4,0), statusbar-button disabled is tripled; the statusbar `.button.button` and `.button.accent`/`.fill` set colour and background that `.iconButton.iconButton` does not.
- PropertiesTable: the createStyles `thead` rule (sticky) was never applied to any element, and `.tr { margin: 0 }` does nothing on a table row; the module drops the first and keeps the second as written. The resizer's `background: theme.primaryColor` is the string "blue", which CSS reads as the keyword (pure #0000ff), not the palette blue; the `table-resizer` token keeps that value (the grip is invisible until hover, then at 0.5 opacity).
- PropertiesTable footer: the nested MantineProvider only sets ActionIcon defaults (size xs, radius sm, the `icon` hover fill gray[8], and a `[data-disabled]` rule: clear fill, gray[8] icon, no border). The footer sat in the light-scheme statusbar, so both pager icons keep gray[6] in both themes (the `statusbar-icon` token). The page-number Badge and both selects take `theme.colors.dark` (dark[9], as an array, last wins) with white text. Previous/next buttons now have `aria-label`s; the photo toggle has one too.
- PropertiesTable: the sort header, a Mantine Flex with `onClick`, is a div with the same click plus an Enter handler (no role or tabindex, so the photo toggle stays the only button in the head). The image cell's `img` has `alt` set to the column id; Mantine rendered none. Base UI's tooltip popup has no `role="tooltip"`, so the url-tooltip visual case waits for the label text instead, and allows 0.001 of the pixels to differ for the same rounded-position drift as the other tooltip cases.
- Internal Badge gained radius `xs` (the column type badges) and variant `outline` in the dark colour (link and mixed-value badges), with baselines generated from Mantine first; it also forwards its ref and extra props so a tooltip can trigger on it.
