import { fireEvent, screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore, sliderFromEnd } from "./controls-test-utils"
import { PointControls } from "./PointControls"

describe("PointControls", () => {
    it("shows the color label with the hex and a radius slider", () => {
        renderWithRecordingStore(<PointControls layerId="l1" color="#ff0000" circleRange={[0, 5]} />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByText("#ff0000")).toBeInTheDocument()
        expect(screen.getByText("Radius")).toBeInTheDocument()
        expect(sliderFromEnd(1)).toHaveAttribute("aria-valuenow", "5")
    })

    it("dispatches the new radius on ArrowRight", () => {
        const dispatched = renderWithRecordingStore(<PointControls layerId="l1" color="#ff0000" circleRange={[0, 5]} />)

        fireEvent.keyDown(sliderFromEnd(1), { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", min: 0, max: 6 } }))
    })
})
