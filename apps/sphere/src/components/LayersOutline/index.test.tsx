import appReducer from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { LayerType } from "@/types"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LayersOutline } from "."

const layer = {
    id: "l1",
    name: "Roads layer",
    type: LayerType.Point,
    visible: true,
    sourceId: null,
    fractionIndex: 1,
    color: "blue",
}

function renderOutline(visible: boolean) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: {
            app: appReducer,
            layer: () => ({ selectedId: "l1", items: { l1: { ...layer, visible } }, allIds: ["l1"] }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })
    render(
        <Provider store={store}>
            <LayersOutline />
        </Provider>,
    )
    return dispatchedActions
}

describe("LayersOutline", () => {
    it("hides a visible layer from its visibility button", () => {
        const dispatched = renderOutline(true)
        fireEvent.click(screen.getByRole("button", { name: "Hide layer" }))
        expect(dispatched).toContainEqual({ type: "layer/setVisible", payload: { id: "l1", value: false } })
    })

    it("shows a hidden layer from its visibility button", () => {
        const dispatched = renderOutline(false)
        fireEvent.click(screen.getByRole("button", { name: "Show layer" }))
        expect(dispatched).toContainEqual({ type: "layer/setVisible", payload: { id: "l1", value: true } })
    })
})
