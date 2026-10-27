import { act, fireEvent, render, screen } from "@/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Spotlight } from "."

// Opening or closing the palette starts a Mantine transition whose 10ms
// pre-state timer survives unmount. Let it fire while the DOM still exists,
// or it throws "window is not defined" after the environment is torn down.
const TRANSITION_SETTLE_MS = 20

afterEach(async () => {
    await act(() => new Promise(resolve => setTimeout(resolve, TRANSITION_SETTLE_MS)))
})

const { mockDispatch, mockCopyGeojson, selectorSourceId, selectorCount, selectorWrapFc, selectorWktSep } = vi.hoisted(
    () => ({
        mockDispatch: vi.fn(),
        mockCopyGeojson: vi.fn(),
        selectorSourceId: Symbol("sourceId"),
        selectorCount: Symbol("count"),
        selectorWrapFc: Symbol("wrapFc"),
        selectorWktSep: Symbol("wktSep"),
    }),
)

vi.mock("react-map-gl/maplibre", () => ({
    useMap: () => ({}),
}))

vi.mock("../../store/hooks", () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: unknown) => {
        if (selector === selectorSourceId) return "src-1"
        if (selector === selectorCount) return 2
        if (selector === selectorWrapFc) return true
        if (selector === selectorWktSep) return "\n"
        return undefined
    },
}))

vi.mock("../../store/selectors", () => ({
    selectors: {
        selection: { sourceId: selectorSourceId, count: selectorCount },
        settings: {
            selectCopyWrapAsFeatureCollection: selectorWrapFc,
            selectCopyWktSeparator: selectorWktSep,
        },
    },
}))

vi.mock("../../lib/copy-selection", () => ({
    copySelectionAsGeojson: (...args: unknown[]) => mockCopyGeojson(...args),
    copySelectionAsWkt: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
    writeText: vi.fn(),
}))

vi.mock("@/logger", () => ({
    default: { error: vi.fn() },
}))

function openPalette() {
    render(
        <Spotlight mapId="map">
            <div>content</div>
        </Spotlight>,
    )
    fireEvent.keyDown(document.documentElement, { key: "p", ctrlKey: true })
}

describe("Spotlight", () => {
    it("opens on its shortcut and lists command titles", async () => {
        openPalette()
        expect(await screen.findByText("Toggle Zen")).toBeDefined()
        expect(screen.getByText("Toggle Dark Theme")).toBeDefined()
    })

    it("filters commands by typed text", async () => {
        openPalette()
        fireEvent.change(await screen.findByPlaceholderText("Search..."), { target: { value: "zen" } })
        expect(screen.getByText("Toggle Zen")).toBeDefined()
        expect(screen.queryByText("Globe")).toBeNull()
    })

    it("dispatches toggleZenMode when Toggle Zen is chosen", async () => {
        openPalette()
        fireEvent.click(await screen.findByText("Toggle Zen"))
        expect(mockDispatch).toHaveBeenCalledWith({ type: "app/toggleZenMode" })
    })

    it("adds an OpenStreetMap basemap when chosen", async () => {
        openPalette()
        fireEvent.click(await screen.findByText("Add OpenStreetMap"))
        expect(mockDispatch).toHaveBeenCalledWith({ type: "source/addBasemap", payload: "osm" })
    })

    it("adds a Sentinel-2 satellite basemap when chosen", async () => {
        openPalette()
        fireEvent.click(await screen.findByText("Add Sentinel-2 satellite"))
        expect(mockDispatch).toHaveBeenCalledWith({ type: "source/addBasemap", payload: "sentinel2-2016" })
    })

    it("no longer offers map style commands", async () => {
        openPalette()
        await screen.findByText("Toggle Zen")
        for (const title of ["OSM", "Vector", "Satellite"]) {
            expect(screen.queryByText(title)).toBeNull()
        }
    })

    it("copies the selection as GeoJSON when chosen", async () => {
        mockCopyGeojson.mockResolvedValue(undefined)
        openPalette()
        fireEvent.change(await screen.findByPlaceholderText("Search..."), { target: { value: "as geojson" } })
        fireEvent.click(screen.getByText("Copy selection as GeoJSON"))
        expect(mockCopyGeojson).toHaveBeenCalledWith("src-1", true)
    })
})
