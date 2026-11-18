import { excludeIdsFilter } from "@/lib/maplibre"
import { SourceType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { drawSlice } from "./draw"
import { geometrySpecs, type PreviewGeometrySpec } from "./preview"

// Layer ids are `draw-context-<sourceId>-{point,line,polygon}`
const DRAW_CONTEXT_PREFIX = "draw-context"

export const selectDrawHiddenIds = drawSlice.selectors.hiddenIds

// Read the slice field directly, as preview.ts does: `sourceSlice` imports the tree selectors
const selectDrawnSource = (state: RootState) => {
    const sourceId = drawSlice.selectors.sourceId(state)
    return sourceId === undefined ? undefined : state.source.items[sourceId]
}

/**
 * The context layers of the drawn source, bottom to top: while drawing, they show the
 * features of the source that are not loaded into draw (outside the selection or the
 * viewport, or over the cap), so the map keeps showing the whole source. They point at the
 * source already mounted for it and are not interactive.
 */
export const selectDrawContextLayerSpecs = createSelector([selectDrawnSource], (source): PreviewGeometrySpec[] => {
    if (!source || source.pending) {
        return []
    }
    if (source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) {
        return []
    }
    return geometrySpecs(`${DRAW_CONTEXT_PREFIX}-${source.id}`, source.id, source.id).reverse()
})

/** Hides every feature loaded into draw: draw shows those, edited or not */
export const selectDrawContextFilter = createSelector([selectDrawHiddenIds], hiddenIds => excludeIdsFilter(hiddenIds))
