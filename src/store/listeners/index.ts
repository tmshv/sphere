import { isAnyOf } from "@reduxjs/toolkit"
import { selectionSlice } from "../selection"
import { appSlice } from "../app"
import * as turf from "@turf/turf"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"
import mapboxgl from "mapbox-gl"
import { LayerType, SourceMetadata, SourceType } from "@/types"
import { nextId } from "@/lib/nextId"
import { duplicate } from "../layer"
import { actions } from "../actions"
import { RootState } from ".."
import { assertUnreachable } from "@/lib"

function predictLayerType({ pointsCount, linesCount, polygonsCount }: SourceMetadata): LayerType | null {
    if (pointsCount > 0 && linesCount === 0 && polygonsCount === 0) {
        return LayerType.Point
    }
    if (pointsCount === 0 && linesCount > 0 && polygonsCount === 0) {
        return LayerType.Line
    }
    if (pointsCount === 0 && linesCount === 0 && polygonsCount > 0) {
        return LayerType.Polygon
    }
    return null
}

export const failMiddleware = createListenerMiddleware()
failMiddleware.startListening({
    matcher: isAnyOf(
        actions.source.addFromFile.rejected,
        actions.source.addFromUrl.rejected,
    ),
    effect: async (action, listenerApi) => {
        console.log("fail", action)
        listenerApi.dispatch(actions.error.setError(action.error.message))
    },
})

export const clearErrorMiddleware = createListenerMiddleware()
clearErrorMiddleware.startListening({
    actionCreator: actions.error.setError,
    effect: async (action, listenerApi) => {
        await listenerApi.delay(3000)
        listenerApi.dispatch(actions.error.clear())
    },
})

export const zoomToMiddleware = createListenerMiddleware()
zoomToMiddleware.startListening({
    actionCreator: actions.source.zoomTo,
    effect: async (action, listenerApi) => {
        const mapId = "spheremap"
        const map = getMap(mapId)
        if (!map) {
            return
        }

        const sourceId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const source = state.source.items[sourceId]
        if (!source) {
            return
        }

        const { type } = source
        switch (type) {
            case SourceType.FeatureCollection: {
                const bbox = turf.bbox(source.dataset)

                listenerApi.dispatch(actions.map.fitBounds({
                    mapId,
                    bounds: bbox as mapboxgl.LngLatBoundsLike,
                }))
            }
            case SourceType.Geojson: {
                break
            }
            case SourceType.MVT: {
                break
            }
            case SourceType.Raster: {
                break
            }
            default: {
                assertUnreachable(type)
            }
        }
    },
})

export const mapInteractiveMiddleware = createListenerMiddleware()
mapInteractiveMiddleware.startListening({
    actionCreator: actions.map.setInteractive,
    effect: async (action, listenerApi) => {
        const { mapId, value } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        const element = map.getCanvasContainer()
        element.style.cursor = value ? "pointer" : ""
    },
})

export const selectFeaturesMiddleware = createListenerMiddleware()
selectFeaturesMiddleware.startListening({
    actionCreator: actions.selection.selectOne,
    effect: async (action, listenerApi) => {
        const map = getMap("spheremap")
        if (!map) {
            return
        }

        const state = listenerApi.getOriginalState() as RootState
        const { featureId, layerId } = action.payload

        const prevLayerId = state.selection.layerId
        if (prevLayerId && layerId !== prevLayerId) {
            map.setFilter(`${prevLayerId}-selected`, ["in", "id", ""])
        }

        // const source = state.source.items[sourceId]
        // const f = source.data.data.find(f => f.id === featureId)
        // if (!f) {
        //     return
        // }

        // console.log("select!", featureId, sourceId);

        map.setFilter(`${layerId}-selected`, ["in", "id", ...[featureId]])

        // console.log(f.properties);
    },
})

export const clearSelectionMiddleware = createListenerMiddleware()
clearSelectionMiddleware.startListening({
    actionCreator: actions.selection.reset,
    effect: async (action, listenerApi) => {
        const map = getMap("spheremap")
        if (!map) {
            return
        }
        const state = listenerApi.getOriginalState() as RootState
        const layerId = state.selection.layerId
        if (!layerId) {
            return
        }

        map.setFilter(`${layerId}-selected`, ["in", "id", ""])
    },
})

export const addSourceMiddleware = createListenerMiddleware()
addSourceMiddleware.startListening({
    actionCreator: actions.source.addFromFile.fulfilled,
    effect: async (action, listenerApi) => {
        const { sourceId, name, meta } = action.payload

        const layerType = predictLayerType(meta)
        if (!layerType) {
            return
        }

        const layerId = nextId("layer")
        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            sourceId,
            fractionIndex: Math.random(),
            visible: true,
            name: name,
            color: "#1c7ed6",
        }))
        listenerApi.dispatch(actions.layer.setType({
            id: layerId,
            type: layerType,
        }))
    },
})

export const addBlankLayerMiddleware = createListenerMiddleware()
addBlankLayerMiddleware.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        const sourceId = action.payload
        const layerId = nextId("layer")
        const source = sourceId ? state.source.items[sourceId] : null
        let name = source ? source.name : "Layer"

        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            fractionIndex: 0.99999,
            visible: true,
            name,
            color: "#1c7ed6",
        }))

        if (sourceId && source) {
            listenerApi.dispatch(actions.layer.setSource({
                id: layerId,
                sourceId,
            }))

            // try to predict default layer view
            if (source.type === SourceType.FeatureCollection && !source.pending) {
                const layerType = predictLayerType(source.meta)
                if (layerType) {
                    listenerApi.dispatch(actions.layer.setType({
                        id: layerId,
                        type: layerType,
                    }))
                }
            }
        }

        listenerApi.dispatch(actions.selection.selectLayer({
            layerId,
        }))
    },
})

export const forceResizeMapMiddleware = createListenerMiddleware()
forceResizeMapMiddleware.startListening({
    matcher: isAnyOf(
        appSlice.actions.toggleZenMode,
        appSlice.actions.showLeftSidebar,
        appSlice.actions.hideLeftSidebar,
        appSlice.actions.showRightSidebar,
        appSlice.actions.hideRightSidebar,
        selectionSlice.actions.reset, // I'm not sure about this
    ),
    effect: async (_, listenerApi) => {
        const map = getMap("spheremap")
        if (!map) {
            return
        }

        // resize map in next tick
        await listenerApi.delay(0)

        map.resize()
    },
})

export const duplicateLayerMiddleware = createListenerMiddleware()
duplicateLayerMiddleware.startListening({
    actionCreator: duplicate,
    effect: async (action, listenerApi) => {
        const layerId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const layer = state.layer.items[layerId]

        listenerApi.dispatch(actions.layer.addLayer({
            ...layer,
            fractionIndex: layer.fractionIndex + 0.00001,
            id: nextId("layer"),
            name: layer.name + " copy",
            visible: true,
        }))
    },
})
