# @sphere/draw

Drawing and editing of points, lines and polygons on a MapLibre GL map, as a map control (`MapLibreDraw`).

This package is a TypeScript fork of [hyvilo/maplibre-gl-draw](https://github.com/hyvilo/maplibre-gl-draw) at commit `db8b7f0` (published as `@hyvilo/maplibre-gl-draw@1.0.0`), which is itself a MapLibre port of [mapbox-gl-draw](https://github.com/mapbox/mapbox-gl-draw). It is a private workspace package of Sphere and is not published. License: ISC (see `LICENSE`).

## Usage

```ts
import MapLibreDraw from "@sphere/draw"
import "@sphere/draw/maplibre-gl-draw.css"

const draw = new MapLibreDraw({ displayControlsDefault: false, controls: { polygon: true, trash: true } })
map.addControl(draw, "top-left")

map.on("draw.create", event => {
    // event.features: the created features
})
```

`maplibre-gl` is a peer dependency, used for types only. The package declares its `draw.*` events on MapLibre's `Map`, so `map.on("draw.create", …)` is typed. Option, feature and event types are named exports of `@sphere/draw`.

The API (methods, options, events, styling) is described in [docs/API.md](docs/API.md), custom modes in [docs/MODES.md](docs/MODES.md), and examples in [docs/EXAMPLES.md](docs/EXAMPLES.md). These documents come from upstream.

## Changes from upstream

- Written in TypeScript; the hand-written `index.d.ts` is gone.
- No runtime dependencies: `hat`, `xtend`, `lodash.isequal` and the `@mapbox/*` GeoJSON helpers are replaced by small modules in `src/lib/`.
- Fixed: polygons under the cursor are sorted by area again (the area was never computed, so a small polygon inside a large one could not be picked first), and multi geometries are ranked like their single counterparts.
- Fixed: `combineFeatures()` / `uncombineFeatures()` no longer throw in modes other than `simple_select`.
- Fixed: MultiPoint vertices get string coordinate paths like every other geometry.
- Removed the `map.fire` monkey patch for an old mapbox-gl event signature.

## Development

From the repo root:

```bash
npm test -w @sphere/draw        # Vitest (happy-dom), tests next to the code
npm run typecheck -w @sphere/draw
npm run lint -w @sphere/draw
npm run format                  # Biome, whole repo
```

Test helpers and mocks (mock map, mock contexts, GeoJSON fixtures, event factories) are in `src/test-utils/`.
