import appReducer, { actions as appActions } from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import MapToolbar from "./MapToolbar"

function renderToolbar(setup?: (dispatch: (action: unknown) => void) => void) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })
    setup?.(store.dispatch)
    render(
        <Provider store={store}>
            <MapToolbar />
        </Provider>,
    )
    return { dispatchedActions, store }
}

describe("MapToolbar", () => {
    it("renders one radio per tool inside a named group", () => {
        renderToolbar()
        expect(screen.getByRole("radiogroup", { name: "Map tool" })).toBeInTheDocument()
        expect(screen.getAllByRole("radio")).toHaveLength(3)
        expect(screen.getByRole("radio", { name: "Navigation" })).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Select" })).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Info" })).toBeInTheDocument()
    })

    it("checks the active tool", () => {
        renderToolbar()
        expect(screen.getByRole("radio", { name: "Navigation" })).toBeChecked()
        expect(screen.getByRole("radio", { name: "Select" })).not.toBeChecked()
    })

    it.each([
        ["Navigation", "navigation"],
        ["Select", "select"],
        ["Info", "info"],
    ])("%s radio sets the %s map tool", (name, tool) => {
        const { dispatchedActions, store } = renderToolbar(dispatch => dispatch(appActions.setMapTool("info")))
        fireEvent.click(screen.getByRole("radio", { name }))
        expect(dispatchedActions).toContainEqual({ type: "app/setMapTool", payload: tool })
        expect(store.getState().app.mapTool).toBe(tool)
    })

    it("Escape resets to the default tool", () => {
        const { store } = renderToolbar(dispatch => dispatch(appActions.setMapTool("select")))
        fireEvent.keyDown(window, { key: "Escape" })
        expect(store.getState().app.mapTool).toBe("navigation")
    })

    it("renders nothing in zen mode", () => {
        renderToolbar(dispatch => dispatch(appActions.toggleZenMode()))
        expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    })
})
