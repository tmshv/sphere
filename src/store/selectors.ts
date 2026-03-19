import { STYLE_OSM } from "@/const"
import { SourceType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { appSlice as app, selectActiveSidebarTab } from "./app"
import { drawSlice as draw } from "./draw"
import { layerSlice as layer } from "./layer"
import { selectionSlice as selection } from "./selection"
import { sourceSlice as source } from "./source"
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
        const source = items[sourceId]
        if (!source) return undefined
        if (source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) return undefined
        if (source.pending) return undefined
        return sourceId
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
