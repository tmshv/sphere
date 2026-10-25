import { fireEvent, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore } from "./controls-test-utils"
import { PhotoControls } from "./PhotoControls"

function renderPhoto() {
    return renderWithRecordingStore(
        <PhotoControls
            layerId="l1"
            clusterRadius={100}
            srcField="img"
            valueField={undefined}
            icon="square"
            fields={["img", "val"]}
        />,
    )
}

describe("PhotoControls", () => {
    it("shows labels and current values", () => {
        renderPhoto()

        expect(screen.getByText("Radius")).toBeInTheDocument()
        expect(screen.getByLabelText("Image field")).toHaveValue("img")
        expect(screen.getByLabelText("Value field")).toHaveValue("")
        expect(screen.getByLabelText("Layout")).toHaveValue("Square")
    })

    it("dispatches the new cluster radius on ArrowRight", () => {
        const dispatched = renderPhoto()

        fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", value: 101 } }))
    })

    it("dispatches the picked layout", async () => {
        const user = userEvent.setup()
        const dispatched = renderPhoto()

        await user.click(screen.getByLabelText("Layout"))
        await user.click(await screen.findByText("Circle"))

        expect(dispatched).toContainEqual(expect.objectContaining({ payload: { id: "l1", value: "circle" } }))
    })
})
