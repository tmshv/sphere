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
