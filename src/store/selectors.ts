import { STYLE_OSM } from "@/const"
import { SourceType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { appSlice as app, selectActiveSidebarTab } from "./app"
import { drawSlice as draw } from "./draw"
import { layerSlice as layer } from "./layer"
import { selectionSlice as selection } from "./selection"
import { sourceSlice as source } from "./source"
import { selectIsShowTerrain } from "./terrain"
// Other code such as selectors can use the imported `RootState` type
const selectProjection = (state: RootState) => {
    const drawing = draw.selectors.isDrawing(state)

    return drawing ? "mercator" : state.projection.value
}

export const selectChangeProjectionAvailable = (state: RootState) => {
    return !draw.selectors.isDrawing(state)
}
// Other code such as selectors can use the imported `RootState` type
export const selectMapStyle = (state: RootState) => {
    const drawing = draw.selectors.isDrawing(state)
    if (drawing) {
        return STYLE_OSM
    }

    return state.mapStyle.value
}

const showTileBoundaries = (state: RootState) => {
    return state.tileBoundaries.value
}

const visibleIds = createSelector([layer.selectors.items, layer.selectors.allIds], (items, allIds) =>
    allIds.filter(id => items[id].visible),
)

export const selectPreviewSourceId = createSelector(
    [(state: RootState) => state.selection.sourceId, (state: RootState) => state.source.items, selectActiveSidebarTab],
    (sourceId, items, tab) => {
        if (tab !== "sources") return undefined
        if (!sourceId) return undefined
        const src = items[sourceId]
        if (!src) return undefined
        if (
            src.type !== SourceType.Geojson &&
            src.type !== SourceType.FeatureCollection &&
            src.type !== SourceType.MVT
        ) return undefined
        if (src.pending) return undefined
        return sourceId
    },
)

export const selectPreviewLayerIds = createSelector(
    [(state: RootState) => state.selection.sourceId, (state: RootState) => state.source.items, selectActiveSidebarTab],
    (sourceId, items, tab): string[] => {
        if (tab !== "sources") return []
        if (!sourceId) return []
        const src = items[sourceId]
        if (!src) return []
        if (src.pending) return []
        if (src.type === SourceType.Geojson || src.type === SourceType.FeatureCollection) {
            return [
                `preview-${sourceId}-point`,
                `preview-${sourceId}-line`,
                `preview-${sourceId}-polygon`,
            ]
        }
        if (src.type === SourceType.MVT) {
            return src.sourceLayers.flatMap(sl => [
                `preview-${sourceId}-${sl.id}-point`,
                `preview-${sourceId}-${sl.id}-line`,
                `preview-${sourceId}-${sl.id}-polygon`,
            ])
        }
        return []
    },
)

export const selectors = {
    app: app.selectors,
    draw: draw.selectors,
    projection: {
        projection: selectProjection,
        changeProjectionAvailable: selectChangeProjectionAvailable,
    },
    mapStyle: {
        style: selectMapStyle,
    },
    terrain: {
        show: selectIsShowTerrain,
    },
    source: source.selectors,
    layer: {
        ...layer.selectors,
        visibleIds,
    },
    selection: selection.selectors,
    tileBoundaries: {
        show: showTileBoundaries,
    },
}
