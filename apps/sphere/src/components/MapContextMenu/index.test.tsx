import { render, screen } from "@/test-utils"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import { MapContextMenu } from "."
import type { MapLayerMouseEvent } from "react-map-gl/maplibre"

type MapEventHandler = (e: MapLayerMouseEvent) => void

const {
    contextmenuHandlerRef,
    selectionState,
    selectorSourceId,
    selectorCount,
    selectorWrapFc,
    selectorWktSep,
    mockCopyGeojson,
    mockCopyWkt,
} = vi.hoisted(() => {
    const contextmenuHandlerRef = { current: null as MapEventHandler | null }
    const selectionState = {
        sourceId: undefined as string | undefined,
        count: 0,
    }
    const selectorSourceId = Symbol("sourceId")
    const selectorCount = Symbol("count")
    const selectorWrapFc = Symbol("wrapFc")
    const selectorWktSep = Symbol("wktSep")
    const mockCopyGeojson = vi.fn()
    const mockCopyWkt = vi.fn()
    return {
        contextmenuHandlerRef,
        selectionState,
        selectorSourceId,
        selectorCount,
        selectorWrapFc,
        selectorWktSep,
        mockCopyGeojson,
        mockCopyWkt,
    }
})

vi.mock("react-map-gl/maplibre", async importOriginal => {
    const actual = await importOriginal<typeof import("react-map-gl/maplibre")>()
    return {
        ...actual,
        useMap: () => ({
            map: {
                getMap: () => ({
                    on: (event: string, handler: MapEventHandler) => {
                        if (event === "contextmenu") {
                            contextmenuHandlerRef.current = handler
                        }
                    },
                    off: (event: string) => {
                        if (event === "contextmenu") {
                            contextmenuHandlerRef.current = null
                        }
                    },
                    getContainer: () => ({
                        getBoundingClientRect: () => ({ left: 0, top: 0 }),
                    }),
                }),
            },
        }),
    }
})

vi.mock("@/hooks/useCursor", () => ({
    useCursor: () => [10, 20] as [number, number],
}))

vi.mock("@/store/hooks", () => ({
    useAppSelector: (selector: unknown) => {
        if (selector === selectorSourceId) return selectionState.sourceId
        if (selector === selectorCount) return selectionState.count
        if (selector === selectorWrapFc) return true
        if (selector === selectorWktSep) return "\n"
        return undefined
    },
    useAppDispatch: () => vi.fn(),
}))

vi.mock("@/store/selectors", () => ({
    selectors: {
        selection: {
            sourceId: selectorSourceId,
            count: selectorCount,
        },
        settings: {
            selectCopyWrapAsFeatureCollection: selectorWrapFc,
            selectCopyWktSeparator: selectorWktSep,
        },
    },
}))

vi.mock("@/lib/copy-selection", () => ({
    copySelectionAsGeojson: (...args: unknown[]) => mockCopyGeojson(...args),
    copySelectionAsWkt: (...args: unknown[]) => mockCopyWkt(...args),
}))

function fireMapContextMenu(point: { x: number; y: number }) {
    contextmenuHandlerRef.current?.({
        point,
        preventDefault: vi.fn(),
    } as unknown as MapLayerMouseEvent)
}

function openMenu() {
    act(() => {
        fireMapContextMenu({ x: 100, y: 200 })
    })
}

describe("MapContextMenu", () => {
    it("does not show menu initially", () => {
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        expect(screen.queryByText("Copy location")).toBeNull()
    })

    it("shows menu after MapLibre contextmenu event", () => {
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        expect(screen.getByText("Copy location")).toBeDefined()
    })

    it("calls copyLocationValue with the cursor coord", () => {
        const copyLocationValue = vi.fn(([lng, lat]: [number, number]) => `${lng},${lat}`)
        render(<MapContextMenu id="map" copyLocationValue={copyLocationValue} />)
        expect(copyLocationValue).toHaveBeenCalledWith([10, 20])
    })

    it("does not show copy selection items when nothing is selected", () => {
        selectionState.sourceId = undefined
        selectionState.count = 0
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        expect(screen.queryByText("Copy selection as GeoJSON")).toBeNull()
        expect(screen.queryByText("Copy selection as WKT")).toBeNull()
    })

    it("does not show copy selection items when count > 0 but sourceId is undefined", () => {
        selectionState.sourceId = undefined
        selectionState.count = 3
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        expect(screen.queryByText("Copy selection as GeoJSON")).toBeNull()
        expect(screen.queryByText("Copy selection as WKT")).toBeNull()
    })

    it("shows copy selection items when selection is active", () => {
        selectionState.sourceId = "src-1"
        selectionState.count = 5
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        expect(screen.getByText("Copy selection as GeoJSON")).toBeDefined()
        expect(screen.getByText("Copy selection as WKT")).toBeDefined()
    })

    it("calls copySelectionAsGeojson when GeoJSON item is clicked", async () => {
        selectionState.sourceId = "src-1"
        selectionState.count = 2
        mockCopyGeojson.mockResolvedValue(undefined)
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        await act(async () => {
            screen.getByText("Copy selection as GeoJSON").click()
        })
        expect(mockCopyGeojson).toHaveBeenCalledWith("src-1", true)
    })

    it("calls copySelectionAsWkt when WKT item is clicked", async () => {
        selectionState.sourceId = "src-1"
        selectionState.count = 2
        mockCopyWkt.mockResolvedValue(undefined)
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        openMenu()
        await act(async () => {
            screen.getByText("Copy selection as WKT").click()
        })
        expect(mockCopyWkt).toHaveBeenCalledWith("src-1", "\n")
    })
})
