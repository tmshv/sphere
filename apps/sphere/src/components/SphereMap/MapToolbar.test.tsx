import appReducer from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import MapToolbar from "./MapToolbar"

function renderToolbar() {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })
    render(
        <Provider store={store}>
            <MapToolbar />
        </Provider>,
    )
    return dispatchedActions
}

describe("MapToolbar", () => {
    it("marks the active tool as pressed", () => {
        renderToolbar()
        expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false")
    })

    it.each([
        ["Navigation", "navigation"],
        ["Select", "select"],
        ["Info", "info"],
    ])("%s button sets the %s map tool", (title, tool) => {
        const dispatched = renderToolbar()
        fireEvent.click(screen.getByTitle(title))
        expect(dispatched).toContainEqual({ type: "app/setMapTool", payload: tool })
    })
})
