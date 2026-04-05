import { configureStore } from "@reduxjs/toolkit"
import app from "./app"
import draw from "./draw"
import error from "./error"
import layer from "./layer"
import * as listeners from "./listeners"
import { listener as mapListener } from "./map"
import mapInteraction from "./map-interaction"
import mapStyle from "./mapStyle"
import projection from "./projection"
import properties from "./properties"
import selection from "./selection"
import settings from "./settings"
import sky from "./sky"
import source from "./source"
import terrain from "./terrain"
import tileBoundaries from "./tile-boundaries"
import tools from "./tools"
export { actions } from "./actions"
export { selectors } from "./selectors"

export const store = configureStore({
    reducer: {
        app,
        mapInteraction,
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
        settings,
        properties,
        tools,
    },
    middleware: getDefaultMiddleWare => {
        return getDefaultMiddleWare().prepend(
            mapListener.middleware,
            listeners.addBlankLayer.middleware,
            listeners.forceResizeMap.middleware,
            listeners.clearSelection.middleware,
            listeners.selectionChanged.middleware,
            listeners.zoomTo.middleware,
            listeners.addSource.middleware,
            listeners.duplicateLayer.middleware,
            listeners.fail.middleware,
            listeners.clearError.middleware,
            listeners.mapInteractive.middleware,
            listeners.resetTool.middleware,
            listeners.autoSelectOnDelete.middleware,
            listeners.exitDrawOnSourceDelete.middleware,
            listeners.saveDraw.middleware,
            listeners.mapToolChanged.middleware,
            listeners.rectSelect.middleware,
            listeners.startDraw.middleware,
        )
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
