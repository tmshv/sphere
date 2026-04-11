import { STYLE_OSM } from "@/const"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { appSlice as app } from "./app"
import { drawSlice as draw } from "./draw"
import { layerSlice as layer } from "./layer"
import { selectPreviewLayerIds, selectPreviewLayerSpecs, selectPreviewSourceId } from "./preview"
import { selectionSlice as selection } from "./selection"
import { settingsSlice as settings } from "./settings"
import { sourceSlice as source } from "./source"
import { mapInteractionSlice as mapInteraction } from "./map-interaction"
import { selectPopupEntries } from "./properties"
import { selectIsShowTerrain } from "./terrain"
import { toolsSlice as tools } from "./tools"
export type { PreviewLayerSpec } from "./preview"
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
    settings: settings.selectors,
    tileBoundaries: {
        show: showTileBoundaries,
    },
    preview: {
        sourceId: selectPreviewSourceId,
        layerSpecs: selectPreviewLayerSpecs,
        layerIds: selectPreviewLayerIds,
    },
    mapInteraction: mapInteraction.selectors,
    tools: tools.selectors,
    propertiesPopup: {
        entries: selectPopupEntries,
    },
}
