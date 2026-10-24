import { fireEvent, screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore } from "./controls-test-utils"
import { HeatmapControls } from "./HeatmapControls"

function renderHeatmap() {
    return renderWithRecordingStore(<HeatmapControls layerId="l1" heatmapRadius={10} heatmapIntensity={2} />)
}

describe("HeatmapControls", () => {
    it("shows the radius and intensity labels", () => {
        renderHeatmap()

        expect(screen.getByText("Radius")).toBeInTheDocument()
        expect(screen.getByText("Intensity")).toBeInTheDocument()
        expect(screen.getAllByRole("slider")).toHaveLength(2)
    })

    it("dispatches the new radius on ArrowRight", () => {
        const dispatched = renderHeatmap()

        fireEvent.keyDown(screen.getAllByRole("slider")[0], { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", radius: 11 } }))
    })

    it("dispatches the new intensity on ArrowRight", () => {
        const dispatched = renderHeatmap()

        fireEvent.keyDown(screen.getAllByRole("slider")[1], { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", intensity: 3 } }))
    })
})
