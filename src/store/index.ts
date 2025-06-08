import { configureStore } from "@reduxjs/toolkit"
import projection from "./projection"
import mapStyle from "./mapStyle"
import sky from "./sky"
import terrain from "./terrain"
import source from "./source"
import layer from "./layer"
import selection from "./selection"
import properties from "./properties"
import app from "./app"
import draw from "./draw"
import { listener as mapListener } from "./map"
import error from "./error"
import * as listeners from "./listeners"
export { actions } from "./actions"

export const store = configureStore({
    reducer: {
        app,
        draw,
        error,
        projection,
        mapStyle,
        sky,
        terrain,
        source,
        layer,
        selection,
        properties,
    },
    middleware: (getDefaultMiddleWare) => {
        return getDefaultMiddleWare()
            .prepend(mapListener.middleware)
            .prepend(listeners.addBlankLayer.middleware)
            .prepend(listeners.forceResizeMap.middleware)
            .prepend(listeners.clearSelection.middleware)
            .prepend(listeners.selectFeatures.middleware)
            .prepend(listeners.zoomTo.middleware)
            .prepend(listeners.addSource.middleware)
            .prepend(listeners.duplicateLayer.middleware)
            .prepend(listeners.fail.middleware)
            .prepend(listeners.clearError.middleware)
            .prepend(listeners.mapInteractive.middleware)
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
