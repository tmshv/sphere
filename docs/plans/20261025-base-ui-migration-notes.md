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
