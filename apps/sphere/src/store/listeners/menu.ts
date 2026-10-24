import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { sourceSlice } from "../source"
import { selectSelectedSourceId } from "../source/tree-selectors"
import { actions } from "../actions"
import { menuTrigger } from "../menu"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: menuTrigger,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const { dispatch } = listenerApi
        const sourceId = selectSelectedSourceId(state)
        // Remove acts on the node itself: a child resolves to its parent, which must not be removed
        const nodeId = sourceSlice.selectors.selectSelectedId(state)
        const layerId = state.layer.selectedId
        const hasSelection = state.selection.count > 0 && Boolean(state.selection.sourceId)

        switch (action.payload) {
            case "file.open":
                dispatch(actions.openFiles())
                return

            case "edit.copy-selection-geojson":
                if (!hasSelection) return
                dispatch(actions.selection.copySelection("geojson"))
                return

            case "edit.copy-selection-wkt":
                if (!hasSelection) return
                dispatch(actions.selection.copySelection("wkt"))
                return

            case "view.toggle-left-sidebar":
                dispatch(actions.app.toggleLeftSidebar())
                return

            case "view.toggle-right-sidebar":
                dispatch(actions.app.toggleRightSidebar())
                return

            case "view.toggle-zen-mode":
                dispatch(actions.app.toggleZenMode())
                return

            case "view.toggle-dark-theme":
                dispatch(actions.app.toggleDarkTheme())
                return

            case "view.toggle-terrain":
                dispatch(actions.terrain.toggle())
                return

            case "view.toggle-sky":
                dispatch(actions.sky.toggle())
                return

            case "view.toggle-tile-boundaries":
                dispatch(actions.tileBoundaries.toggle())
                return

            case "source.show-properties":
                if (!sourceId) return
                dispatch(actions.source.showProperties({ id: sourceId }))
                return

            case "source.zoom-to":
                if (!sourceId) return
                dispatch(actions.source.zoomTo(sourceId))
                return

            case "source.remove":
                if (!nodeId) return
                dispatch(actions.source.removeSource(nodeId))
                return

            case "layer.add-blank":
                if (!sourceId) return
                dispatch(actions.layer.addBlankLayer(sourceId))
                return

            case "layer.duplicate":
                if (!layerId) return
                dispatch(actions.layer.duplicate(layerId))
                return

            case "layer.delete":
                if (!layerId) return
                dispatch(actions.layer.removeLayer(layerId))
                return
        }
    },
})

export default listener
