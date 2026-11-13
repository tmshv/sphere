import appReducer from "@/store/app"
import drawReducer from "@/store/draw"
import terrainReducer from "@/store/terrain"
import { fireEvent, render, screen } from "@/test-utils"
import { makeMvtSource, makeSourceState } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import userEvent from "@testing-library/user-event"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { HILLSHADE_ALTITUDE, HILLSHADE_DEFAULTS, HILLSHADE_DIRECTION, HILLSHADE_INTENSITY } from "@/lib/terrain"
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
        fireEvent.keyDown(await screen.findByRole("slider", { name: "Exaggeration" }), { key: "ArrowRight" })
        expect(store.getState().terrain.exaggeration).toBeCloseTo(DEFAULT_EXAGGERATION + EXAGGERATION_STEP)
    })

    it("groups the popup into a Terrain and a Hillshade section", async () => {
        renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        const terrain = await screen.findByRole("region", { name: "Terrain" })
        const hillshade = screen.getByRole("region", { name: "Hillshade" })
        expect(terrain).toContainElement(screen.getByRole("slider", { name: "Exaggeration" }))
        expect(hillshade).toContainElement(screen.getByRole("switch"))
        expect(hillshade).toContainElement(screen.getByRole("slider", { name: "Intensity" }))
    })

    it("sets the hillshade intensity, light direction and altitude from their sliders", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        fireEvent.keyDown(await screen.findByRole("slider", { name: "Intensity" }), { key: "ArrowRight" })
        fireEvent.keyDown(screen.getByRole("slider", { name: "Light direction" }), { key: "ArrowLeft" })
        fireEvent.keyDown(screen.getByRole("slider", { name: "Light altitude" }), { key: "ArrowRight" })
        const settings = store.getState().terrain.hillshadeSettings
        expect(settings.intensity).toBeCloseTo(HILLSHADE_DEFAULTS.intensity + HILLSHADE_INTENSITY.step)
        expect(settings.direction).toBe(HILLSHADE_DEFAULTS.direction - HILLSHADE_DIRECTION.step)
        expect(settings.altitude).toBe(HILLSHADE_DEFAULTS.altitude + HILLSHADE_ALTITUDE.step)
    })

    it("sets the hillshade method from the dropdown", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        await userEvent.click(await screen.findByLabelText("Method"))
        await userEvent.click(await screen.findByText("Igor"))
        expect(store.getState().terrain.hillshadeSettings.method).toBe("igor")
        expect(screen.getByRole("region", { name: "Hillshade" })).toBeInTheDocument()
    })

    it("sets whether the light follows the map or the screen", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        await userEvent.click(await screen.findByRole("radio", { name: "Map" }))
        expect(store.getState().terrain.hillshadeSettings.anchor).toBe("map")
    })

    it("keeps the popup open while a colour picker is used", async () => {
        renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        await userEvent.click(await screen.findByRole("button", { name: "Shadow picker" }))
        await userEvent.click(await screen.findByRole("slider", { name: /hue/i }))
        expect(screen.getByRole("region", { name: "Hillshade" })).toBeInTheDocument()
    })

    it("sets the shadow, highlight and accent colours", async () => {
        const store = renderButton([rasterMbtiles("a")])
        fireEvent.contextMenu(screen.getByRole("button", { name: "Terrain" }))
        for (const [label, value] of [
            ["Shadow", "#112233"],
            ["Highlight", "#ddeeff"],
            ["Accent", "#445566"],
        ]) {
            const field = await screen.findByLabelText(label)
            fireEvent.change(field, { target: { value } })
            fireEvent.blur(field)
        }
        expect(store.getState().terrain.hillshadeSettings).toMatchObject({
            shadowColor: "#112233",
            highlightColor: "#ddeeff",
            accentColor: "#445566",
        })
    })
})
