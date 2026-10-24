import { fireEvent, screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore, sliderFromEnd } from "./controls-test-utils"
import { ExtrusionControls } from "./ExtrusionControls"

function renderExtrusion() {
    return renderWithRecordingStore(
        <ExtrusionControls
            layerId="l1"
            color="#0000ff"
            extrusionHeight={3}
            extrusionHeightField="h"
            extrusionBase={1}
            extrusionBaseField={undefined}
            fields={["h", "b"]}
        />,
    )
}

describe("ExtrusionControls", () => {
    it("shows labels, hex and current field", () => {
        renderExtrusion()

        expect(screen.getByText("#0000ff")).toBeInTheDocument()
        expect(screen.getByText("Height")).toBeInTheDocument()
        expect(screen.getByText("Base")).toBeInTheDocument()
        expect(screen.getByLabelText("Height field")).toHaveValue("h")
        expect(screen.getByLabelText("Base field")).toHaveValue("")
    })

    it("dispatches the new height on ArrowRight", () => {
        const dispatched = renderExtrusion()

        fireEvent.keyDown(sliderFromEnd(2), { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", height: 4 } }))
    })

    it("dispatches the new base on ArrowRight", () => {
        const dispatched = renderExtrusion()

        fireEvent.keyDown(sliderFromEnd(1), { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", base: 2 } }))
    })
})
