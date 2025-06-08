import { isAnyOf } from "@reduxjs/toolkit"
import { selectionSlice } from "../selection"
import { actions } from "../app"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"

const listener = createListenerMiddleware()
listener.startListening({
    matcher: isAnyOf(
        actions.toggleZenMode,
        actions.showLeftSidebar,
        actions.hideLeftSidebar,
        actions.showRightSidebar,
        actions.hideRightSidebar,
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
})

export default listener
