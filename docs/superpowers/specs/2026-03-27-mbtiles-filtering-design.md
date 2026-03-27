# MBTiles Vector Tile Filtering — Design Spec

## Summary

Add client-side attribute filtering for MBTiles vector (PBF) layers using MapLibre's native `filter` property. No backend changes. GeoJSON filtering continues to use the existing backend-driven approach.

## Problem

The filter UI in `LayerPanel` is hidden for all tile sources (`isTileSource` guard at line 270). MBTiles vector tiles contain attribute data that MapLibre can filter natively, but there is no way to apply filters to these layers.

## Design

### Filtering strategy selector

A new selector determines, per layer, which filtering strategy applies:

- **Backend-filtered** — GeoJSON/FeatureCollection layers with a filter. Source ID resolves to `layer-${layerId}`. `FilteredLayerSource` creates the side-source.
- **MapLibre-filtered** — MVT vector (PBF) layers with a filter. Source ID stays as the original. The user's filter expression is passed to the MapLibre `<Layer>` `filter` prop.
- **Unfiltered** — layers without a filter. Source ID is the original. No extra filter expression.

This selector replaces the inline `filter ? \`layer-${layerId}\` : rawSourceId` logic currently in `SphereLayer`'s `select`. The selector consumes both the layer and its source (to check source type/format).

**Selector output per layer:**

```ts
type LayerFilterStrategy =
    | { sourceId: string; userFilter: null }           // unfiltered
    | { sourceId: string; userFilter: unknown[] }      // maplibre-filtered (MVT PBF)
    | { sourceId: string; userFilter: null }           // backend-filtered (sourceId = `layer-${layerId}`)
```

In practice, the selector returns `{ sourceId, userFilter }` where:
- For backend-filtered: `sourceId` = `layer-${layerId}`, `userFilter` = `null` (filter already applied server-side)
- For MapLibre-filtered: `sourceId` = original, `userFilter` = `layer.filter.expression`
- For unfiltered: `sourceId` = original, `userFilter` = `null`

### Where the selector lives

Extend the existing `select` selector in `SphereLayer.tsx`. It already reads the layer; add the source lookup to determine the strategy. The selector will read `state.source.items[layer.sourceId]` to check `source.type === SourceType.MVT && source.format === "pbf"`.

### FilteredLayerSource gating

`FilteredLayerSource` continues to render for every layer in `MapBody`, but the selector-driven `sourceId` in `SphereLayer` means MVT layers never reference `layer-${layerId}`. The `FilteredLayerSource` component already returns `null` when `!layer.filter`, and for MVT layers with a filter, `sourceId` stays original — the side-source `layer-${layerId}` is unused. No features are fetched because `FilteredLayerSource` only fetches when `sourceId` and `expressionJson` are set and the source has a feature store.

Alternatively, `MapBody` could skip rendering `FilteredLayerSource` for MVT layers, but the current component already handles the no-op case safely, so no change is needed there.

### Combining filters in layer components

Each geometry layer component (`PointLayer`, `SphereLineStringLayer`, `SpherePolygonLayer`) receives a new optional `userFilter` prop from `SphereLayer`.

When `userFilter` is provided, the component combines it with the geometry-type filter:

```ts
// Example in PointLayer
const geometryFilter = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]
const filter = userFilter
    ? ["all", geometryFilter, userFilter]
    : geometryFilter
```

For layer types rendered directly in `SphereLayer` (Extrusion, Heatmap), the same pattern applies inline — combine with `["all", existingFilter, userFilter]`.

Raster and Photo layer types do not support filtering (Raster is pre-rendered images; Photo uses clustering which is incompatible with MapLibre filters).

### LayerPanel UI change

Replace the `isTileSource` guard with a more specific condition. The filter input should be **shown** for:
- GeoJSON / FeatureCollection sources (existing behavior)
- MVT sources with `format === "pbf"` (new)

The filter input remains **hidden** for:
- MVT sources with raster format (`png`/`jpg`/`webp`)
- Raster sources

Change: replace `isTileSource` with a new flag `isFilterable` (or rename/adjust `isTileSource` usage at the filter input site). Computed as:

```ts
const isFilterable = source?.type !== SourceType.Raster &&
    !(source?.type === SourceType.MVT && isRasterTileFormat(source.format))
```

## What doesn't change

- **Backend** — no Rust changes
- **GeoJSON filtering** — continues via `FilteredLayerSource` and `source_get_filtered`
- **Attribute table** — remains unavailable for MVT sources
- **Layer data model** — reuses existing `layer.filter` field
- **Filter expression format** — same MapLibre expression JSON arrays

## Data flow

```
User types expression in LayerPanel
  → dispatch setLayerFilter({ id, expression })
  → layer.filter.expression stored in Redux

SphereLayer selector reads layer + source
  → source is MVT PBF → strategy: MapLibre-filtered
  → sourceId = original, userFilter = expression

PointLayer/LineStringLayer/PolygonLayer receive userFilter prop
  → filter = ["all", geometryFilter, userFilter]
  → <Layer filter={filter} /> passed to MapLibre

MapLibre applies filter client-side on decoded vector tile features
```

## Files to modify

| File                                         | Change                                                            |
|----------------------------------------------|-------------------------------------------------------------------|
| `src/components/SphereMap/SphereLayer.tsx`    | Extend `select` to read source, compute strategy, pass userFilter |
| `src/components/SphereMap/PointLayer.tsx`     | Accept optional `userFilter` prop, combine with geometry filter   |
| `src/components/SphereMap/ShpereLineStringLayer.tsx` | Same as PointLayer                                        |
| `src/components/SphereMap/SpherePolygonLayer.tsx`    | Same as PointLayer                                        |
| `src/components/LayerPanel/index.tsx`         | Replace `isTileSource` guard on filter input with `isFilterable`  |

## Edge cases

- **Invalid expression** — MapLibre silently ignores invalid filter expressions (no features rendered). The existing `setLayerFilterError` mechanism only applies to backend validation. For MVT, validation would require a MapLibre error handler or pre-validation. Out of scope for this iteration — user sees no features if the expression is wrong.
- **Empty expression** — clearing the input dispatches `setLayerFilter({ id, expression: null })`, removing the filter. `userFilter` becomes `null`, geometry-only filter is used.
- **Layer type switch** — if a user switches an MVT layer to Heatmap or Raster type while a filter is active, the filter persists in Redux but has no effect (Heatmap/Raster don't use geometry-type filters to combine with). This is acceptable — the filter input would still show, and the user can clear it.
