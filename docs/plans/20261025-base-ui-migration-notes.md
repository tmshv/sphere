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
