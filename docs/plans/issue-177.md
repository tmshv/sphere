# MBTiles Vector Tile Filtering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable client-side attribute filtering for MBTiles vector (PBF) layers using MapLibre's native `filter` property.

**Architecture:** The `SphereLayer` selector determines filtering strategy per layer based on source type. For MVT PBF layers, the user's filter expression is passed as a `userFilter` prop to geometry layer components, which combine it with their geometry-type filter via `["all", ...]`. For GeoJSON layers, existing backend-filtered side-source behavior is unchanged.

**Tech Stack:** React, Redux Toolkit (createSelector), MapLibre GL, react-map-gl, Vitest

---

## File Map

| File                                                 | Action | Responsibility                                               |
|------------------------------------------------------|--------|--------------------------------------------------------------|
| `src/lib/maplibre.ts`                                | Modify | Add `combineFilters` helper                                  |
| `src/lib/maplibre.test.ts`                           | Modify | Tests for `combineFilters`                                   |
| `src/testutils.ts`                                   | Modify | Add `makeMvtSource` factory                                  |
| `src/components/LayerPanel/index.tsx`                 | Modify | Replace `isTileSource` filter guard with `isFilterable` flag |
| `src/components/LayerPanel/index.test.ts`            | Modify | Tests for `isFilterable` in `layerSelector`                  |
| `src/components/SphereMap/SphereLayer.tsx`            | Modify | Extend selector to resolve filtering strategy                |
| `src/components/SphereMap/PointLayer.tsx`             | Modify | Accept `userFilter`, use `combineFilters`                    |
| `src/components/SphereMap/ShpereLineStringLayer.tsx`  | Modify | Accept `userFilter`, use `combineFilters`                    |
| `src/components/SphereMap/SpherePolygonLayer.tsx`     | Modify | Accept `userFilter`, use `combineFilters`                    |

---

### Task 1: Add `combineFilters` helper

**Files:**
- Modify: `src/lib/maplibre.ts`
- Modify: `src/lib/maplibre.test.ts`

- [x] **Step 1: Write failing tests for `combineFilters`**

Add to `src/lib/maplibre.test.ts`:

```ts
import { combineFilters, sourceLayerProp, visibility } from "./maplibre"

describe("combineFilters", () => {
    it("should return base filter when user filter is null", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]
        expect(combineFilters(base, null)).toEqual(base)
    })

    it("should return base filter when user filter is undefined", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]
        expect(combineFilters(base, undefined)).toEqual(base)
    })

    it("should combine base and user filter with 'all'", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]
        const user = ["==", ["get", "type"], "airport"]
        expect(combineFilters(base, user)).toEqual(["all", base, user])
    })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/maplibre.test.ts`
Expected: FAIL — `combineFilters` is not exported

- [x] **Step 3: Implement `combineFilters`**

Add to `src/lib/maplibre.ts`:

```ts
export function combineFilters(base: unknown[], userFilter?: unknown[] | null): unknown[] {
    if (!userFilter) {
        return base
    }
    return ["all", base, userFilter]
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/maplibre.test.ts`
Expected: PASS

- [x] **Step 5: Run formatter**

Run: `npm run format`

- [x] **Step 6: Commit**

```bash
git add src/lib/maplibre.ts src/lib/maplibre.test.ts
git commit -m "Add combineFilters helper for composing MapLibre filter expressions"
```

---

### Task 2: Add `makeMvtSource` test factory

**Files:**
- Modify: `src/testutils.ts`

- [x] **Step 1: Add `makeMvtSource` factory**

Add to `src/testutils.ts`:

```ts
export function makeMvtSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.MVT,
        location: `/path/to/${id}.mbtiles`,
        fractionIndex: 0,
        editable: false as const,
        pending: false as const,
        format: "pbf" as const,
        tilejson: { vector_layers: [] },
        sourceLayers: [],
        ...overrides,
    }
}
```

- [x] **Step 2: Run formatter**

Run: `npm run format`

- [x] **Step 3: Commit**

```bash
git add src/testutils.ts
git commit -m "Add makeMvtSource test factory"
```

---

### Task 3: Replace `isTileSource` filter guard with `isFilterable` in LayerPanel

**Files:**
- Modify: `src/components/LayerPanel/index.tsx`
- Modify: `src/components/LayerPanel/index.test.ts`

- [ ] **Step 1: Write failing tests for `isFilterable`**

Add to `src/components/LayerPanel/index.test.ts`:

```ts
import { makeGeojsonSource, makeMvtSource } from "@/testutils"
```

Update the import at the top to include `makeMvtSource`. Then add a new describe block:

```ts
describe("layerSelector isFilterable", () => {
    test("is true for GeoJSON source", () => {
        const source = makeGeojsonSource("s1")
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result?.isFilterable).toBe(true)
    })

    test("is true for MVT PBF source", () => {
        const source = makeMvtSource("s1", { format: "pbf" })
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result?.isFilterable).toBe(true)
    })

    test("is false for MVT raster (png) source", () => {
        const source = makeMvtSource("s1", { format: "png" })
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result?.isFilterable).toBe(false)
    })

    test("is false for Raster source", () => {
        const source = {
            id: "s1",
            name: "Source s1",
            type: SourceType.Raster,
            location: "/path/to/s1.tif",
            fractionIndex: 0,
            editable: false,
            pending: false,
        }
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result?.isFilterable).toBe(false)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/LayerPanel/index.test.ts`
Expected: FAIL — `isFilterable` is not a property on the result

- [ ] **Step 3: Add `isFilterable` to `layerSelector` and use it in the component**

In `src/components/LayerPanel/index.tsx`, in the `layerSelector` return object (around line 88-121), replace:

```ts
            isTileSource: source?.type === SourceType.MVT || source?.type === SourceType.Raster,
```

with:

```ts
            isTileSource: source?.type === SourceType.MVT || source?.type === SourceType.Raster,
            isFilterable:
                source?.type !== SourceType.Raster &&
                !(source?.type === SourceType.MVT && isRasterTileFormat(source.format)),
```

Then in the destructuring of `layer` (around line 138-152), add `isFilterable`:

```ts
        isTileSource,
        isFilterable,
    } = layer
```

Then replace the filter guard (around line 270):

```ts
            {isTileSource ? null : (
```

with:

```ts
            {!isFilterable ? null : (
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/LayerPanel/index.test.ts`
Expected: PASS

- [ ] **Step 5: Run formatter**

Run: `npm run format`

- [ ] **Step 6: Commit**

```bash
git add src/components/LayerPanel/index.tsx src/components/LayerPanel/index.test.ts
git commit -m "Show filter input for MVT vector layers in LayerPanel"
```

---

### Task 4: Extend `SphereLayer` selector to resolve filtering strategy

**Files:**
- Modify: `src/components/SphereMap/SphereLayer.tsx`

The `select` selector currently computes `sourceId` as `filter ? \`layer-${layerId}\` : rawSourceId`. It needs to also read the source to decide:
- MVT PBF + filter → keep original sourceId, pass `userFilter`
- GeoJSON/FeatureCollection + filter → use `layer-${layerId}` sourceId, no `userFilter`
- No filter → original sourceId, no `userFilter`

- [ ] **Step 1: Add source lookup to the selector inputs**

In `src/components/SphereMap/SphereLayer.tsx`, modify the `select` selector. Replace the current selector (lines 31-219):

Change the input selectors from:

```ts
const select = createSelector(
    [
        (state: RootState, id: string) => state.layer.items[id],
        // (state: RootState, id: string) => state.source.items[id],
    ],
    layer => {
```

to:

```ts
const select = createSelector(
    [
        (state: RootState, id: string) => state.layer.items[id],
        (state: RootState, id: string) => {
            const sourceId = state.layer.items[id]?.sourceId
            return sourceId ? state.source.items[sourceId] : undefined
        },
    ],
    (layer, source) => {
```

- [ ] **Step 2: Compute filtering strategy**

Replace the `sourceId` computation (line 50):

```ts
        const sourceId = filter ? `layer-${layerId}` : rawSourceId
```

with:

```ts
        const isMaplibreFiltered =
            filter &&
            source?.type === SourceType.MVT &&
            !source.pending &&
            source.format === "pbf"
        const sourceId = filter && !isMaplibreFiltered ? `layer-${layerId}` : rawSourceId
        const userFilter = isMaplibreFiltered ? (filter.expression as unknown[]) : null
```

Add the required imports at the top of the file:

```ts
import { SourceType } from "@/types"
```

- [ ] **Step 3: Thread `userFilter` into layer props**

For the `Point` case, add `userFilter` to props:

```ts
            case LayerType.Point: {
                const props: PointLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    options: circle,
                    userFilter,
                }
                return ["Point", props] as SelectTuple<PointLayerProps>
            }
```

For the `Line` case:

```ts
            case LayerType.Line: {
                const props: SphereLineStringLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    thick: false,
                    userFilter,
                }
                return ["LineString", props] as SelectTuple<SphereLineStringLayerProps>
            }
```

For the `Polygon` case:

```ts
            case LayerType.Polygon: {
                const props: SpherePolygonLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    userFilter,
                }
                return ["Polygon", props] as SelectTuple<SpherePolygonLayerProps>
            }
```

For the `Extrusion` case, combine the filter inline. Replace:

```ts
                    filter: ["==", ["geometry-type"], "Polygon"],
```

with:

```ts
                    filter: userFilter
                        ? ["all", ["==", ["geometry-type"], "Polygon"], userFilter]
                        : ["==", ["geometry-type"], "Polygon"],
```

The `Heatmap`, `Raster`, and `Photo` cases remain unchanged — they don't use geometry-type filters that would benefit from combining.

- [ ] **Step 4: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 5: Run the full test suite to verify nothing is broken**

Run: `npm test`
Expected: PASS (no component tests for SphereLayer exist, but this ensures no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/components/SphereMap/SphereLayer.tsx
git commit -m "Extend SphereLayer selector with filtering strategy for MVT layers"
```

---

### Task 5: Accept `userFilter` in geometry layer components

**Files:**
- Modify: `src/components/SphereMap/PointLayer.tsx`
- Modify: `src/components/SphereMap/ShpereLineStringLayer.tsx`
- Modify: `src/components/SphereMap/SpherePolygonLayer.tsx`

- [ ] **Step 1: Update `PointLayer`**

In `src/components/SphereMap/PointLayer.tsx`:

Add import:

```ts
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
```

Add `userFilter` to the props type:

```ts
export type PointLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    userFilter?: unknown[] | null
    options?: {
        maxRadius: number
        minRadius: number
    }
}
```

Add `userFilter` to the destructured props:

```ts
export const PointLayer: React.FC<PointLayerProps> = ({ layerId, sourceId, sourceLayer, color, options, visible, userFilter }) => {
```

Replace the hardcoded filter on the main layer (not the `-selected` layer):

```ts
                filter={combineFilters(["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]], userFilter)}
```

- [ ] **Step 2: Update `SphereLineStringLayer`**

In `src/components/SphereMap/ShpereLineStringLayer.tsx`:

Add import:

```ts
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
```

Add `userFilter` to the props type:

```ts
export type SphereLineStringLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    thick: boolean
    userFilter?: unknown[] | null
}
```

Add `userFilter` to the destructured props:

```ts
export const SphereLineStringLayer: React.FC<SphereLineStringLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
    thick,
    userFilter,
}) => {
```

Replace the hardcoded filter on the outline layer (line 54) and the main line layer (line 67) — both use the same geometry filter. Do NOT change the `-selected` layer filter:

```ts
                filter={combineFilters(["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]], userFilter)}
```

- [ ] **Step 3: Update `SpherePolygonLayer`**

In `src/components/SphereMap/SpherePolygonLayer.tsx`:

Add import:

```ts
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
```

Add `userFilter` to the props type:

```ts
export type SpherePolygonLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    userFilter?: unknown[] | null
}
```

Add `userFilter` to the destructured props:

```ts
export const SpherePolygonLayer: React.FC<SpherePolygonLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
    userFilter,
}) => {
```

Replace the hardcoded filter on the fill layer (line 59), outline-0 layer (line 72), and outline-1 layer (line 85). Do NOT change the `-selected` layer filter:

```ts
                filter={combineFilters(["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], userFilter)}
```

- [ ] **Step 4: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/SphereMap/PointLayer.tsx src/components/SphereMap/ShpereLineStringLayer.tsx src/components/SphereMap/SpherePolygonLayer.tsx
git commit -m "Accept userFilter in geometry layer components for MVT filtering"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Build the frontend**

Run: `npm run build`
Expected: Successful build with no type errors
