import { configureStore } from '@reduxjs/toolkit'
import projection, { projectionSlice } from './projection'
import mapStyle, { mapStyleSlice } from './mapStyle'
import fog, { fogSlice } from './fog'
import terrain, { terrainSlice } from './terrain'
import source, { sourceSlice } from './source'
import selection, { selectionSlice } from './selection'
import { fitBounds } from './map'
import { readFromFile, addFromFiles, } from './source/readFromFile'
import * as turf from '@turf/turf'

import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getMap } from '../map'
import mapboxgl from 'mapbox-gl'
const readFromFilesMiddleware = createListenerMiddleware();
readFromFilesMiddleware.startListening({
    actionCreator: addFromFiles,
    effect: async (action, listenerApi) => {
        for (const file of action.payload) {
            listenerApi.dispatch(actions.source.readFromFile(file))
        }

        await listenerApi.delay(1000)

        const state = listenerApi.getState() as RootState
        const id = state.source.lastAdded
        if (!id) {
            return
        }

        const geom = state.source.items[id].data
        var bbox = turf.bbox(geom);

        listenerApi.dispatch(fitBounds({
            mapId: "spheremap",
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
        if(!map) {
            return
        }
        map.fitBounds(bounds)
    },
});

const selectFeaturesMiddleware = createListenerMiddleware();
selectFeaturesMiddleware.startListening({
    actionCreator: selectionSlice.actions.selectOne,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        const { featureId, sourceId } = action.payload
        const source = state.source.items[sourceId]
        const f = source.data.features.find(f => f.id === featureId)
        if (!f) {
            return
        }

        console.log("select!");
        console.log(f.properties);
    },
});

export const store = configureStore({
    reducer: {
        projection,
        mapStyle,
        fog,
        terrain,
        source,
        selection,
    },
    middleware: (getDefaultMiddleWare) => {
        return getDefaultMiddleWare()
            .prepend(selectFeaturesMiddleware.middleware)
            .prepend(fitBoundsMiddleware.middleware)
            .prepend(readFromFilesMiddleware.middleware)
    }
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export const actions = {
    projection: projectionSlice.actions,
    mapStyle: mapStyleSlice.actions,
    fog: fogSlice.actions,
    terrain: terrainSlice.actions,
    source: {
        readFromFile,
        readFromFiles: addFromFiles,
        ...sourceSlice.actions,
    },
    map: {
        fitBounds,
    },
    selection: selectionSlice.actions,
}
