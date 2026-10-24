import { fireEvent, render, screen } from "@/test-utils"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { SourcesOutline } from "."

const sourceState = {
    selectedId: "s1",
    allIds: ["s1", "s2"],
    items: {
        s1: { id: "s1", name: "Roads", type: "geojson" },
        s2: { id: "s2", name: "Rivers", type: "geojson" },
    },
}

function renderOutline() {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: {
            source: () => sourceState,
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })
    render(
        <Provider store={store}>
            <SourcesOutline />
        </Provider>,
    )
    return dispatchedActions
}

describe("SourcesOutline", () => {
    it("renders one item per source with its name", () => {
        renderOutline()
        expect(screen.getByText("Roads")).toBeDefined()
        expect(screen.getByText("Rivers")).toBeDefined()
    })

    it("selects a source when its item is clicked", () => {
        const dispatched = renderOutline()
        fireEvent.click(screen.getByText("Rivers"))
        expect(dispatched).toContainEqual({ type: "source/select", payload: "s2" })
    })
})
