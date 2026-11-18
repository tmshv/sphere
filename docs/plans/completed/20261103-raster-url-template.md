# Plan: raster source from a URL template (issue #283, level 1)

Spec: `docs/specs/20261103-raster-url-template.md`

### Task 1: Template parsing
- [x] Add `projectionCrs(projection)` in `apps/sphere/src/lib/projection.ts` with tests
- [x] Add `parseRasterTemplate(template, crs)` in `apps/sphere/src/lib/raster-template.ts` with tests covering every rule of the spec

### Task 2: Store wiring
- [x] Add `rasterUrlDialogOpen` with `openRasterUrlDialog` / `closeRasterUrlDialog` to the `app` slice, with tests
- [x] Extract the "raster source + layer below every layer" step of `add-basemap` into a shared helper; keep `add-basemap` tests green
- [x] Add `source.addRasterFromUrl` action and the `add-raster-url` listener, registered in `listeners/index.ts`, with tests

### Task 3: Entry points
- [x] Add `file.add-raster-url` to the native menu spec and to `listeners/menu.ts`, with tests
- [x] Add the `add-raster-url` command to the command palette, with a test

### Task 4: Dialog
- [x] Add `RasterUrlDialog` component mounted in `App`, with tests for live validation, disabled submit, name override and close

### Task 5: Finish
- [x] Update `AGENTS.md` (app slice, basemaps paragraph, new listener)
- [x] Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `cargo test` for the menu spec
