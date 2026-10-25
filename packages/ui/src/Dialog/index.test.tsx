import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen, waitFor } from "../test-utils"
import { Dialog } from "."

const TAB_PRESSES = 4

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

function Opener() {
    const [opened, setOpened] = useState(false)
    return (
        <>
            <button type="button" onClick={() => setOpened(true)}>
                Open
            </button>
            <Dialog opened={opened} onClose={() => setOpened(false)} title="Input URL">
                <input aria-label="field" />
            </Dialog>
        </>
    )
}

describe("Dialog focus and dismissal", () => {
    it("traps focus and returns it to the opener on close", async () => {
        const user = userEvent.setup()
        render(<Opener />)
        const opener = screen.getByRole("button", { name: "Open" })

        await user.click(opener)
        const dialog = await screen.findByRole("dialog")
        expect(screen.getByRole("button", { name: "Close" })).toHaveFocus()
        expect(dialog.contains(document.activeElement)).toBe(true)

        for (let i = 0; i < TAB_PRESSES; i++) {
            await user.tab()
            expect(dialog.contains(document.activeElement)).toBe(true)
        }

        await user.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(opener).toHaveFocus()
    })

    it("closes on backdrop click", async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(
            <Dialog opened onClose={onClose} title="Input URL">
                <p>body</p>
            </Dialog>,
        )
        await screen.findByRole("dialog")

        await user.click(document.body)

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes from the close button", async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(
            <Dialog opened onClose={onClose} title="Input URL">
                <p>body</p>
            </Dialog>,
        )

        await user.click(await screen.findByRole("button", { name: "Close" }))

        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
