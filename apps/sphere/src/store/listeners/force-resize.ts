import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { isAnyOf, createListenerMiddleware } from "@reduxjs/toolkit"
import { actions as appActions } from "../app"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    matcher: isAnyOf(
        appActions.toggleZenMode,
        appActions.showLeftSidebar,
        appActions.hideLeftSidebar,
        appActions.showRightSidebar,
        appActions.hideRightSidebar,
        actions.selection.reset,
    ),
    effect: async (_, listenerApi) => {
        const map = getMap(MAP_ID)
        if (!map) {
            return
        }

        await listenerApi.delay(0)

        map.resize()
    },
})

export default listener
