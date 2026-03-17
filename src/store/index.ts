import { configureStore } from "@reduxjs/toolkit"
import app from "./app"
import draw from "./draw"
import error from "./error"
import layer from "./layer"
import * as listeners from "./listeners"
import { listener as mapListener } from "./map"
import mapStyle from "./mapStyle"
import projection from "./projection"
import properties from "./properties"
import selection from "./selection"
import sky from "./sky"
import source from "./source"
import terrain from "./terrain"
import tileBoundaries from "./tile-boundaries"
export { actions } from "./actions"
export { selectors } from "./selectors"

export const store = configureStore({
    reducer: {
        app,
        draw,
        error,
        projection,
        tileBoundaries,
        mapStyle,
        sky,
        terrain,
        source,
        layer,
        selection,
        properties,
    },
    middleware: getDefaultMiddleWare => {
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
