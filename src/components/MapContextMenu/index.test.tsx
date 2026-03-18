import { fireEvent, render, screen } from "@/test-utils"
import { describe, expect, it, vi } from "vitest"
import { MapContextMenu } from "."

vi.mock("react-map-gl/maplibre", async importOriginal => {
    const actual = await importOriginal<typeof import("react-map-gl/maplibre")>()
    return {
        ...actual,
        useMap: () => ({
            map: {
                getMap: () => ({
                    on: vi.fn(),
                    off: vi.fn(),
                }),
            },
        }),
    }
})

vi.mock("@/hooks/useCursor", () => ({
    useCursor: () => [10, 20] as [number, number],
}))

describe("MapContextMenu", () => {
    it("renders the Copy location menu item after contextmenu event", () => {
        render(<MapContextMenu id="map" copyLocationValue={([lng, lat]) => `${lng},${lat}`} />)
        fireEvent.contextMenu(document)
        expect(screen.getByText("Copy location")).toBeDefined()
    })

    it("calls copyLocationValue with the mocked coord when Copy location is clicked", () => {
        const copyLocationValue = vi.fn(([lng, lat]: [number, number]) => `${lng},${lat}`)
        render(<MapContextMenu id="map" copyLocationValue={copyLocationValue} />)
        expect(copyLocationValue).toHaveBeenCalledWith([10, 20])
    })
})
