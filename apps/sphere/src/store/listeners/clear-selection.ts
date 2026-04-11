import { emitSelectionDelta } from "@/lib/selection-bus"
import { selectionClear } from "@/lib/selection-ipc"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.reset,
    effect: async () => {
        const delta = await selectionClear()
        emitSelectionDelta(delta)
    },
})

export default listener
