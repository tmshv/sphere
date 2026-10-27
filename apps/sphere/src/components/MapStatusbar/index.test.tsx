import appReducer, { appSlice } from "@/store/app"
import drawReducer from "@/store/draw"
import errorReducer from "@/store/error"
import projectionReducer from "@/store/projection"
import selectionReducer, { selectionSlice } from "@/store/selection"
import sourceReducer from "@/store/source"
import terrainReducer from "@/store/terrain"
import { fireEvent, render, screen } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import { MapStatusbar } from "."

vi.mock("react-map-gl/maplibre", () => ({ useMap: () => ({}) }))

const VERSION = "1.2.3"
const SELECTED = 4

function makeStore() {
    const store = configureStore({
        reducer: {
            app: appReducer,
            draw: drawReducer,
            error: errorReducer,
            projection: projectionReducer,
            selection: selectionReducer,
            source: sourceReducer,
            terrain: terrainReducer,
        },
    })
    store.dispatch(appSlice.actions.setVersion(VERSION))
    store.dispatch(selectionSlice.actions.sync({ count: SELECTED }))
    return store
}

function renderStatusbar() {
    const store = makeStore()
    render(
        <Provider store={store}>
            <MapStatusbar id="main" />
        </Provider>,
    )
    return store
}

describe("MapStatusbar", () => {
    it("shows the app version", () => {
        renderStatusbar()
        expect(screen.getByText(`Sphere ${VERSION}`)).toBeInTheDocument()
    })

    it("shows the sources count", () => {
        renderStatusbar()
        expect(screen.getByText("sources=0")).toBeInTheDocument()
    })

    it("shows the selection count", () => {
        renderStatusbar()
        expect(screen.getByText(/^selected=4/)).toBeInTheDocument()
    })

    it("marks the current map tool as pressed", () => {
        renderStatusbar()
        expect(screen.getByRole("button", { name: "Navigation" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false")
    })

    it("switches the map tool when Select is clicked", () => {
        const store = renderStatusbar()
        fireEvent.click(screen.getByRole("button", { name: "Select" }))
        expect(store.getState().app.mapTool).toBe("select")
        expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "true")
    })

    it("disables Terrain and has no Satellite button", () => {
        renderStatusbar()
        expect(screen.queryByRole("button", { name: "Satellite" })).toBeNull()
        expect(screen.getByRole("button", { name: "Terrain" })).toBeDisabled()
    })
})
