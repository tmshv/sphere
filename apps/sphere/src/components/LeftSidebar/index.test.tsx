import { makeSourceState } from "@/testutils"
import appReducer, { appSlice } from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { LayerType, SourceType } from "@/types"
import type { Source } from "@/types/source"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LeftSidebar } from "."

const source: Source = {
    id: "s1",
    name: "Roads",
    type: SourceType.Geojson,
    format: "geojson",
    version: 0,
    location: "/tmp/roads.geojson",
    editable: false,
    pending: false,
    meta: {
        columns: {},
        pointsCount: 1,
        multiPointsCount: 0,
        linesCount: 2,
        multiLinesCount: 0,
        polygonsCount: 3,
        multiPolygonsCount: 0,
        collectionsCount: 0,
        nullGeometryCount: 0,
        featuresCount: 6,
    },
}

const layer = {
    id: "l1",
    name: "Roads layer",
    type: LayerType.Point,
    visible: true,
    sourceId: null,
    fractionIndex: 1,
    color: "blue",
}

function makeStore() {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }

    const store = configureStore({
        reducer: {
            app: appReducer,
            source: () => makeSourceState([source]),
            draw: () => ({ sourceId: null, selectedIds: [] }),
            layer: () => ({ selectedId: null, items: { l1: layer }, allIds: ["l1"] }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })

    return { store, dispatchedActions }
}

function renderSidebar() {
    const { store, dispatchedActions } = makeStore()
    render(
        <Provider store={store}>
            <LeftSidebar />
        </Provider>,
    )
    return { dispatchedActions }
}

describe("LeftSidebar", () => {
    it("selects the active tab from the store", () => {
        renderSidebar()

        expect(screen.getByRole("tab", { name: /Sources/ })).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tab", { name: /Layers/ })).toHaveAttribute("aria-selected", "false")
    })

    it("dispatches setActiveSidebarTab when changing to a valid tab", () => {
        const { dispatchedActions } = renderSidebar()

        fireEvent.click(screen.getByRole("tab", { name: /Layers/ }))

        const action = dispatchedActions.find(candidate => appSlice.actions.setActiveSidebarTab.match(candidate))
        expect(action).toBeDefined()
        if (action === undefined || !appSlice.actions.setActiveSidebarTab.match(action)) {
            throw new Error("setActiveSidebarTab action not dispatched")
        }

        expect(action.payload).toBe("layers")
    })
})
