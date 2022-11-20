import { configureStore } from '@reduxjs/toolkit'
import projection, { projectionSlice } from './projection'
import mapStyle, { mapStyleSlice } from './mapStyle'
import fog, { fogSlice } from './fog'
import terrain, { terrainSlice } from './terrain'
import source, { sourceSlice, addFiles, zoomTo } from './source'
import layer, { layerSlice, addBlankLayer } from './layer'
import selection, { selectionSlice } from './selection'
import app, { appSlice } from './app'
import { fitBounds, resize } from './map'
import { addFromFile, addFromUrl, addFromFiles, } from './source/add'
import * as listeners from './listeners'

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
            .prepend(listeners.mapResizeMiddleware.middleware)
            .prepend(listeners.addBlankLayerMiddleware.middleware)
            .prepend(listeners.forceResizeMapMiddleware.middleware)
            .prepend(listeners.selectFeaturesMiddleware.middleware)
            .prepend(listeners.zoomToMiddleware.middleware)
            .prepend(listeners.fitBoundsMiddleware.middleware)
            .prepend(listeners.addFilesMissleware.middleware)
            .prepend(listeners.addSourceMiddleware.middleware)
            .prepend(listeners.readFromFilesMiddleware.middleware)
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
        addFromFile,
        addFromUrl,
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
