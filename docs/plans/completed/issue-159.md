# Plan: Fix Draw Tool — Disable Edit for Geojson Sources (issue #159)

## Context

The draw tool crashes into a broken state for `SourceType.Geojson` sources (all file-backed sources: .geojson, .shp, .gpx, .csv) because `Draw.tsx` only loads data from `source.dataset`, which only exists on `SourceType.FeatureCollection` sources. As a result, entering draw mode on a Geojson source shows no features.

The long-term fix (issues #163, #164) will unify data storage in the Rust backend and enable draw for all source types. This plan is the minimal safe fix: disable the "Edit" button for `SourceType.Geojson` sources so the broken path is never entered.

## Change

### Task 1: Set `editable: false` for Geojson sources

- [x] Set `editable: false` in `addGeojsonSource` (`src/store/source/index.ts`)
- [x] Update `GeojsonSource` type to `editable: false` (`src/types/source.ts`)
- [x] Update `makeGeojsonSource` test utility (`src/testutils.ts`)

### Task 2: Update the SourcePanel selector test

- [x] Update `SourcePanel/index.test.ts` expectation to `editable: false`
- [x] Add `editable` assertions to reducer tests (`src/store/source/index.test.ts`)

## Verification

- `npm test` — all existing tests must pass after updating the expectation
- Manual: open a .geojson file, select it in the Sources panel → "Edit" button is disabled (greyed out)
- Manual: paste GeoJSON from clipboard → "Edit" button is still enabled
