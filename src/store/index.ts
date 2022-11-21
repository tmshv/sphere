import { configureStore } from '@reduxjs/toolkit'
import projection from './projection'
import mapStyle from './mapStyle'
import fog from './fog'
import terrain from './terrain'
import source from './source'
import layer from './layer'
import selection from './selection'
import app from './app'
import error from './error'
import * as listeners from './listeners'
export { actions } from "./actions"

export const store = configureStore({
    reducer: {
        app,
        error,
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
            .prepend(listeners.clearSelectionMiddleware.middleware)
            .prepend(listeners.selectFeaturesMiddleware.middleware)
            .prepend(listeners.zoomToMiddleware.middleware)
            .prepend(listeners.fitBoundsMiddleware.middleware)
            .prepend(listeners.addFilesMissleware.middleware)
            .prepend(listeners.addSourceMiddleware.middleware)
            .prepend(listeners.readFromFilesMiddleware.middleware)
            .prepend(listeners.duplicateLayerMiddleware.middleware)
            .prepend(listeners.failMiddleware.middleware)
            .prepend(listeners.clearErrorMiddleware.middleware)
            .prepend(listeners.mapInteractiveMiddleware.middleware)
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
