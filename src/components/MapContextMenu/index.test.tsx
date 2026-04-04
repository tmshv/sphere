import { render, screen } from "@/test-utils"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import { MapContextMenu } from "."
import type { MapLayerMouseEvent } from "react-map-gl/maplibre"

type MapEventHandler = (e: MapLayerMouseEvent) => void

let contextmenuHandler: MapEventHandler | null = null

vi.mock("react-map-gl/maplibre", async importOriginal => {
    const actual = await importOriginal<typeof import("react-map-gl/maplibre")>()
    return {
        ...actual,
        useMap: () => ({
            map: {
                getMap: () => ({
                    on: (event: string, handler: MapEventHandler) => {
                        if (event === "contextmenu") {
                            contextmenuHandler = handler
                        }
                    },
                    off: (event: string) => {
                        if (event === "contextmenu") {
                            contextmenuHandler = null
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

function fireMapContextMenu(point: { x: number; y: number }) {
    contextmenuHandler?.({
        point,
        preventDefault: vi.fn(),
    } as unknown as MapLayerMouseEvent)
}

describe("MapContextMenu", () => {
    it("does not show menu initially", () => {
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        expect(screen.queryByText("Copy location")).toBeNull()
    })

    it("shows menu after MapLibre contextmenu event", () => {
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        act(() => {
            fireMapContextMenu({ x: 100, y: 200 })
        })
        expect(screen.getByText("Copy location")).toBeDefined()
    })

    it("calls copyLocationValue with the cursor coord", () => {
        const copyLocationValue = vi.fn(([lng, lat]: [number, number]) => `${lng},${lat}`)
        render(<MapContextMenu id="map" copyLocationValue={copyLocationValue} />)
        expect(copyLocationValue).toHaveBeenCalledWith([10, 20])
    })
})
