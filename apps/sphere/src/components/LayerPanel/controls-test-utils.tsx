import { render, screen } from "@/test-utils"
import { type Middleware, type UnknownAction, configureStore, isAction } from "@reduxjs/toolkit"
import type { ReactElement } from "react"
import { Provider } from "react-redux"

export function renderWithRecordingStore(ui: ReactElement) {
    const dispatched: UnknownAction[] = []
    const record: Middleware = () => next => action => {
        if (isAction(action)) {
            dispatched.push(action)
        }
        return next(action)
    }
    const store = configureStore({
        reducer: { noop: () => ({}) },
        middleware: getDefault => getDefault().concat(record),
    })
    render(<Provider store={store}>{ui}</Provider>)
    return dispatched
}

/** Counts from the end, so a ColorPicker's own sliders in front are skipped. */
export function sliderFromEnd(fromEnd: number): HTMLElement {
    const slider = screen.getAllByRole("slider").at(-fromEnd)
    if (!slider) {
        throw new Error(`No slider at position ${fromEnd} from the end`)
    }
    return slider
}
