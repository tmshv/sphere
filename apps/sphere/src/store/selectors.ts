import { LayerType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { appSlice as app } from "./app"
import { drawSlice as draw } from "./draw"
import { layerSlice as layer } from "./layer"
import {
    selectPreviewActive,
    selectPreviewDrawOrder,
    selectPreviewLayerIds,
    selectPreviewLayerSpecs,
    selectPreviewLayerStack,
} from "./preview"
import { selectionSlice as selection } from "./selection"
import { settingsSlice as settings } from "./settings"
import { selectCurrentSourceItem, sourceSlice as source } from "./source"
import {
    selectSelectedInteractive,
    selectSelectedNode,
    selectSelectedNodeActions,
    selectSelectedSourceId,
    selectSelectedSourceLayer,
    selectSelectedSourceRef,
} from "./source/tree-selectors"
import { selectSourceOutline, selectSourceTreeShape } from "./source/outline-selectors"
import { selectCurrentSourceFields, selectCurrentSourceInfo, selectCurrentSourceMeta } from "./sourceInfo/selectors"
import { mapInteractionSlice as mapInteraction } from "./map-interaction"
import { selectPopupEntries } from "./properties"
import { selectIsShowTerrain } from "./terrain"
import { toolsSlice as tools } from "./tools"
export type { PreviewLayerSpec, PreviewLayerStackEntry } from "./preview"
// Other code such as selectors can use the imported `RootState` type
const selectProjection = (state: RootState) => {
    const drawing = draw.selectors.isDrawing(state)

    return drawing ? "mercator" : state.projection.value
}

export const selectChangeProjectionAvailable = (state: RootState) => {
    return !draw.selectors.isDrawing(state)
}
// Other code such as selectors can use the imported `RootState` type
export const selectMapStyle = (state: RootState) => state.mapStyle.value

// User layers on the map, bottom to top. Draw mode keeps only raster layers so a basemap stays under the
// drawing; an active source preview replaces them all
export const selectMapLayers = createSelector(
    [draw.selectors.isDrawing, selectPreviewActive, layer.selectors.items, layer.selectors.allIds],
    (drawing, previewActive, items, allIds) => {
        if (!drawing && previewActive) {
            return []
        }
        return allIds
            .flatMap(id => items[id] ?? [])
            .filter(item => !drawing || item.type === LayerType.Raster)
            .map(item => ({ id: item.id, index: item.fractionIndex }))
            .sort((a, b) => a.index - b.index)
    },
)

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
    source: {
        ...source.selectors,
        selectCurrentSourceItem,
        selectSelectedNode,
        selectSelectedNodeActions,
        selectSelectedSourceRef,
        selectSelectedSourceId,
        selectSelectedSourceLayer,
        selectSelectedInteractive,
        selectSourceOutline,
        selectSourceTreeShape,
    },
    layer: {
        ...layer.selectors,
        visibleIds,
        mapLayers: selectMapLayers,
    },
    selection: selection.selectors,
    settings: settings.selectors,
    sourceInfo: {
        selectCurrentSourceInfo,
        selectCurrentSourceMeta,
        selectCurrentSourceFields,
    },
    tileBoundaries: {
        show: showTileBoundaries,
    },
    preview: {
        active: selectPreviewActive,
        layerSpecs: selectPreviewLayerSpecs,
        layerIds: selectPreviewLayerIds,
        layerStack: selectPreviewLayerStack,
        drawOrder: selectPreviewDrawOrder,
    },
    mapInteraction: mapInteraction.selectors,
    tools: tools.selectors,
    propertiesPopup: {
        entries: selectPopupEntries,
    },
}
