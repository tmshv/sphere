import { open } from '@tauri-apps/api/dialog';
import { isAnyOf } from '@reduxjs/toolkit'
import { selectionSlice } from './selection'
import { appSlice } from './app'
import * as turf from '@turf/turf'
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getMap } from '@/map'
import mapboxgl from 'mapbox-gl'
import { Dataset, LayerType, ParserMetadata } from '@/types'
import { nextId } from '@/lib/nextId'
import { featureCollection } from '@turf/turf'
import { duplicate } from './layer';
import { actions } from './actions';
import { RootState } from '.';

function predictLayerType({ pointsCount, linesCount, polygonsCount }: ParserMetadata): LayerType | null {
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

export const failMiddleware = createListenerMiddleware();
failMiddleware.startListening({
    matcher: isAnyOf(
        actions.source.addFromFile.rejected,
        actions.source.addFromUrl.rejected,
    ),
    effect: async (action, listenerApi) => {
        listenerApi.dispatch(actions.error.setError(action.error.message))
    },
});

export const clearErrorMiddleware = createListenerMiddleware();
clearErrorMiddleware.startListening({
    actionCreator: actions.error.setError,
    effect: async (action, listenerApi) => {
        await listenerApi.delay(3000)
        listenerApi.dispatch(actions.error.clear())
    },
});

export const readFromFilesMiddleware = createListenerMiddleware();
readFromFilesMiddleware.startListening({
    actionCreator: actions.source.addFromFiles,
    effect: async (action, listenerApi) => {
        for (const file of action.payload) {
            listenerApi.dispatch(actions.source.addFromFile(file))
        }

        listenerApi.dispatch(actions.app.showLeftSidebar())

        // await listenerApi.delay(1000)

        // const state = listenerApi.getState() as RootState
        // const id = state.source.lastAdded
        // if (!id) {
        //     return
        // }

        // const geom = state.source.items[id].data
        // const bbox = turf.bbox(geom);

        // listenerApi.dispatch(fitBounds({
        //     mapId: "spheremap",
        //     bounds: bbox as mapboxgl.LngLatBoundsLike
        // }))
    },
});

export const zoomToMiddleware = createListenerMiddleware();
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

        const fc = featureCollection(source.dataset.data.map(g => {
            return {
                type: "Feature",
                geometry: g.geometry,
                properties: {},
            }
        }))
        const bbox = turf.bbox(fc);

        listenerApi.dispatch(actions.map.fitBounds({
            mapId,
            bounds: bbox as mapboxgl.LngLatBoundsLike
        }))
    },
});

export const mapInteractiveMiddleware = createListenerMiddleware();
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
});

export const selectFeaturesMiddleware = createListenerMiddleware();
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
            map.setFilter(`${prevLayerId}-selected`, ['in', 'id', ''])
        }

        // const source = state.source.items[sourceId]
        // const f = source.data.data.find(f => f.id === featureId)
        // if (!f) {
        //     return
        // }

        // console.log("select!", featureId, sourceId);

        map.setFilter(`${layerId}-selected`, ['in', 'id', ...[featureId]])

        // console.log(f.properties);
    },
});

export const clearSelectionMiddleware = createListenerMiddleware();
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

        map.setFilter(`${layerId}-selected`, ['in', 'id', ''])
    },
});

export const addSourceMiddleware = createListenerMiddleware();
addSourceMiddleware.startListening({
    matcher: isAnyOf(
        actions.source.addFromFile.fulfilled,
        actions.source.addFromUrl.fulfilled,
    ),
    effect: async (action, listenerApi) => {
        const dataset = action.payload.dataset as Dataset<any>
        const meta = action.payload.meta as ParserMetadata
        const name = action.payload.name as string
        const location = action.payload.location as string
        if (dataset.data.length === 0) {
            return
        }

        const sourceId = nextId("source")
        listenerApi.dispatch(actions.source.addSource({
            id: sourceId,
            name,
            location,
            dataset,
        }))

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
});

export const addFilesMissleware = createListenerMiddleware();
addFilesMissleware.startListening({
    actionCreator: actions.source.addFiles,
    effect: async (_, listenerApi) => {
        const selected = await open({
            multiple: true,
            filters: [{
                name: 'Geospatial file',
                extensions: ['csv', 'geojson', 'gpx'],
            }]
        });
        if (!selected) {
            return
        }

        if (Array.isArray(selected)) {
            listenerApi.dispatch(actions.source.addFromFiles(selected))
            // select layer
        } else {
            listenerApi.dispatch(actions.source.addFromFiles([selected]))
        }
    },
});

export const addBlankLayerMiddleware = createListenerMiddleware();
addBlankLayerMiddleware.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const layerId = `${nextId()}`
        const name = "New Layer"
        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            fractionIndex: 0.99999,
            visible: true,
            name,
            color: "#1c7ed6",
        }))
        listenerApi.dispatch(actions.selection.selectLayer({
            layerId,
        }))
    }
});

export const forceResizeMapMiddleware = createListenerMiddleware();
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
});

export const duplicateLayerMiddleware = createListenerMiddleware();
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
});
