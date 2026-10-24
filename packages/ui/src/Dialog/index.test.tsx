import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { Dialog } from "."

describe("Dialog", () => {
    it("renders title, children and footer when opened", () => {
        render(
            <Dialog opened onClose={vi.fn()} title="Input URL" footer={<button type="button">Submit</button>}>
                <p>body</p>
            </Dialog>,
        )

        expect(screen.getByText("Input URL")).toBeInTheDocument()
        expect(screen.getByText("body")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument()
    })

    it("renders nothing when closed", () => {
        render(
            <Dialog opened={false} onClose={vi.fn()} title="Input URL" footer={<button type="button">Submit</button>}>
                <p>body</p>
            </Dialog>,
        )

        expect(screen.queryByText("Input URL")).toBeNull()
        expect(screen.queryByText("body")).toBeNull()
        expect(screen.queryByRole("button", { name: "Submit" })).toBeNull()
    })

    it("calls onClose on Escape", () => {
        const onClose = vi.fn()
        render(
            <Dialog opened onClose={onClose} title="Input URL">
                <input aria-label="field" />
            </Dialog>,
        )

        fireEvent.keyDown(screen.getByLabelText("field"), { key: "Escape" })

        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
