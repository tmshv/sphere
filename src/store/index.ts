import { open } from '@tauri-apps/api/dialog';
import { configureStore, isAnyOf } from '@reduxjs/toolkit'
import projection, { projectionSlice } from './projection'
import mapStyle, { mapStyleSlice } from './mapStyle'
import fog, { fogSlice } from './fog'
import terrain, { terrainSlice } from './terrain'
import source, { sourceSlice, addFiles, zoomTo } from './source'
import layer, { layerSlice, addBlankLayer } from './layer'
import selection, { selectionSlice } from './selection'
import app, { appSlice } from './app'
import { fitBounds, resize } from './map'
import { readFromFile, addFromFiles, } from './source/readFromFile'
import * as turf from '@turf/turf'

import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getMap } from '../map'
import mapboxgl from 'mapbox-gl'
import { LayerType, SourceType } from '@/types'
import { nextId } from '@/lib/nextId'
import { featureCollection } from '@turf/turf'

const sourceToLayer = new Map<SourceType, LayerType>([
    [SourceType.Points, LayerType.Point],
    [SourceType.Lines, LayerType.Line],
    [SourceType.Polygons, LayerType.Polygon],
])

const mapResizeMiddleware = createListenerMiddleware();
mapResizeMiddleware.startListening({
    actionCreator: resize,
    effect: async (action, listenerApi) => {
        const mapId = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        map.resize()
    },
});
const readFromFilesMiddleware = createListenerMiddleware();
readFromFilesMiddleware.startListening({
    actionCreator: addFromFiles,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState

        for (const file of action.payload) {
            listenerApi.dispatch(actions.source.readFromFile(file))
        }

        const sidebar = state.app.showLeftSidebar
        if (!sidebar) {
            listenerApi.dispatch(actions.app.showLeftSidebar())
        }

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

const zoomToMiddleware = createListenerMiddleware();
zoomToMiddleware.startListening({
    actionCreator: zoomTo,
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

        const fc = featureCollection(source.data.map(g => {
            return {
                type: "Feature",
                geometry: g.geometry,
                properties: {},
            }
        }))
        const bbox = turf.bbox(fc);

        listenerApi.dispatch(fitBounds({
            mapId,
            bounds: bbox as mapboxgl.LngLatBoundsLike
        }))
    },
});

const fitBoundsMiddleware = createListenerMiddleware();
fitBoundsMiddleware.startListening({
    actionCreator: fitBounds,
    effect: async (action, listenerApi) => {
        const { mapId, bounds } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }
        map.fitBounds(bounds)
    },
});

const selectFeaturesMiddleware = createListenerMiddleware();
selectFeaturesMiddleware.startListening({
    actionCreator: selectionSlice.actions.selectOne,
    effect: async (action, listenerApi) => {
        // const state = listenerApi.getOriginalState() as RootState
        // const { featureId, sourceId } = action.payload
        // const source = state.source.items[sourceId]
        // const f = source.data.data.find(f => f.id === featureId)
        // if (!f) {
        //     return
        // }

        console.log("select!");
        // console.log(f.properties);
    },
});

const readFromFileMiddleware = createListenerMiddleware();
readFromFileMiddleware.startListening({
    actionCreator: readFromFile.fulfilled,
    effect: async (action, listenerApi) => {
        const payload = action.payload
        if (!payload) {
            return
        }
        for (const dataset of payload) {
            if (dataset.data.length === 0) {
                continue
            }

            // const sourceId = `${nextId()}`
            const sourceId = dataset.id
            listenerApi.dispatch(actions.source.addSource(dataset))

            const layerId = nextId()
            listenerApi.dispatch(actions.layer.addLayer({
                id: layerId,
                sourceId,
                fractionIndex: 0,
                visible: true,
                name: dataset.name,
                color: "#1c7ed6",
            }))

            listenerApi.dispatch(actions.layer.setType({
                id: layerId,
                type: sourceToLayer.get(dataset.type),
            }))
        }
    },
});

const addFilesMissleware = createListenerMiddleware();
addFilesMissleware.startListening({
    actionCreator: addFiles,
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
        } else {
            listenerApi.dispatch(actions.source.addFromFiles([selected]))
        }
    },
});

const addBlankLayerMiddleware = createListenerMiddleware();
addBlankLayerMiddleware.startListening({
    actionCreator: addBlankLayer,
    effect: async (action, listenerApi) => {
        const layerId = `${nextId()}`
        const name = "New Layer"
        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            fractionIndex: 0,
            visible: true,
            name,
            color: "#1c7ed6",
        }))
        listenerApi.dispatch(actions.selection.selectLayer({
            layerId,
        }))
    }
});

const forceResizeMapMiddleware = createListenerMiddleware();
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

export const store = configureStore({
    reducer: {
        app,
        projection,
        mapStyle,
        fog,
        terrain,
        source,
        layer,
        selection,
    },
    middleware: (getDefaultMiddleWare) => {
        return getDefaultMiddleWare()
            .prepend(mapResizeMiddleware.middleware)
            .prepend(addBlankLayerMiddleware.middleware)
            .prepend(forceResizeMapMiddleware.middleware)
            .prepend(selectFeaturesMiddleware.middleware)
            .prepend(zoomToMiddleware.middleware)
            .prepend(fitBoundsMiddleware.middleware)
            .prepend(addFilesMissleware.middleware)
            .prepend(readFromFileMiddleware.middleware)
            .prepend(readFromFilesMiddleware.middleware)
    }
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export const actions = {
    app: appSlice.actions,
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
    fog: fogSlice.actions,
    terrain: terrainSlice.actions,
    source: {
        ...sourceSlice.actions,
        zoomTo,
        addFromFiles,
        readFromFile,
        addFiles,
    },
    layer: {
        ...layerSlice.actions,
        addBlankLayer,
    },
    map: {
        fitBounds,
        resize,
    },
    selection: selectionSlice.actions,
}
