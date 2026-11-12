import appReducer from "@/store/app"
import drawReducer from "@/store/draw"
import terrainReducer from "@/store/terrain"
import { fireEvent, render, screen } from "@/test-utils"
import { makeMvtSource, makeSourceState } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import userEvent from "@testing-library/user-event"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { TerrainButton } from "./TerrainButton"

const EXAGGERATION_STEP = 0.1
const DEFAULT_EXAGGERATION = 1.5

function makeStore(sources: ReturnType<typeof makeMvtSource>[] = []) {
    return configureStore({
        reducer: {
            app: appReducer,
            draw: drawReducer,
            source: () => makeSourceState(sources),
            terrain: terrainReducer,
        },
    })
}

function renderButton(sources: ReturnType<typeof makeMvtSource>[] = []) {
    const store = makeStore(sources)
    render(
        <Provider store={store}>
            <TerrainButton />
        </Provider>,
    )
    return store
}

function rasterMbtiles(id: string) {
    return makeMvtSource(id, { format: "png", name: `Dem ${id}` })
}

describe("TerrainButton", () => {
    it("is disabled when there is no elevation source", () => {
        renderButton()
        expect(screen.getByRole("button", { name: "Terrain" })).toBeDisabled()
    })

    it("is enabled with a raster MBTiles source", () => {
        renderButton([rasterMbtiles("a")])
        expect(screen.getByRole("button", { name: "Terrain" })).toBeEnabled()
    })

    it("toggles show on click", () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.click(screen.getByRole("button", { name: "Terrain" }))
        expect(store.getState().terrain.show).toBe(true)
        expect(screen.getByRole("button", { name: "Terrain" })).toHaveAttribute("aria-pressed", "true")
    })

    it("shows the popup controls on right click", async () => {
        renderButton([rasterMbtiles("a")])
        expect(screen.queryByText("Hillshade")).toBeNull()
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        expect(await screen.findByText("Source")).toBeInTheDocument()
        expect(screen.getByText("Exaggeration")).toBeInTheDocument()
        expect(screen.getByText("Hillshade")).toBeInTheDocument()
    })

    it("opens the popup in the statusbar's dark look whatever the app theme", async () => {
        renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        expect((await screen.findByText("Hillshade")).closest('[data-theme="dark"]')).not.toBeNull()
    })

    it("picks a source and shows terrain", async () => {
        const store = renderButton([rasterMbtiles("a"), rasterMbtiles("b")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        await userEvent.click(await screen.findByRole("radio", { name: "Dem a" }))
        expect(store.getState().terrain.sourceId).toBe("a")
        expect(store.getState().terrain.show).toBe(true)
    })

    it("sets hillshade from the switch", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        await userEvent.click(await screen.findByRole("switch"))
        expect(store.getState().terrain.hillshade).toBe(true)
    })

    it("sets exaggeration from the slider", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        fireEvent.keyDown(await screen.findByRole("slider"), { key: "ArrowRight" })
        expect(store.getState().terrain.exaggeration).toBeCloseTo(DEFAULT_EXAGGERATION + EXAGGERATION_STEP)
    })
})
