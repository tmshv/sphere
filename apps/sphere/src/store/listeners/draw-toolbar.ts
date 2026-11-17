import { type DrawControlApi, getDrawControl } from "@/lib/draw-control"
import { DRAW_TOOL_MODES } from "@/lib/draw-mode"
import type { DrawTool, DrawToolbarAction } from "@/types"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()

// A tool starts its mode; pressed while its mode is on (the control is the truth, Redux may lag),
// it cancels the feature being drawn, which draw's trash does in a creation mode
function pressTool(control: DrawControlApi, tool: DrawTool) {
    const mode = DRAW_TOOL_MODES[tool]
    if (control.getMode() === mode) {
        control.trash()
    } else {
        control.changeMode(mode)
    }
}

const RUN: Readonly<Record<DrawToolbarAction, (control: DrawControlApi) => void>> = {
    point: control => pressTool(control, "point"),
    line: control => pressTool(control, "line"),
    polygon: control => pressTool(control, "polygon"),
    trash: control => control.trash(),
    combine: control => control.combineFeatures(),
    uncombine: control => control.uncombineFeatures(),
}

/**
 * Runs a draw toolbar press on the drawn source's control. Draw's public
 * `changeMode` fires no `draw.modechange`, so the mode is read back from the
 * control after every action and reported with `modeChanged`.
 */
listener.startListening({
    actionCreator: actions.draw.toolbar,
    effect: (action, api) => {
        const { sourceId } = action.payload
        if (api.getState().draw.sourceId !== sourceId) return
        // The session ended (or its control is gone) before the press landed
        const control = getDrawControl(sourceId)
        if (!control) return

        RUN[action.payload.action](control)

        const mode = control.getMode()
        if (mode !== null) {
            api.dispatch(actions.draw.modeChanged({ sourceId, mode }))
        }
    },
})

export default listener
