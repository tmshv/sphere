import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { Button, IconButton } from "."

describe("Button", () => {
    it("defaults to type=button and calls onClick", () => {
        const onClick = vi.fn()
        render(<Button onClick={onClick}>Save</Button>)
        const button = screen.getByRole("button", { name: "Save" })
        expect(button).toHaveAttribute("type", "button")
        fireEvent.click(button)
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("type=submit submits its form", () => {
        const onSubmit = vi.fn(event => event.preventDefault())
        render(
            <form onSubmit={onSubmit}>
                <Button type="submit">Send</Button>
            </form>,
        )
        fireEvent.click(screen.getByRole("button", { name: "Send" }))
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn()
        render(
            <Button disabled onClick={onClick}>
                Save
            </Button>,
        )
        const button = screen.getByRole("button", { name: "Save" })
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    it("renders the secondary variant as a button", () => {
        render(<Button variant="secondary">Cancel</Button>)
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    })
})

describe("IconButton", () => {
    it("is named by label and exposes it as title", () => {
        render(<IconButton icon={<svg />} label="Reset north" onClick={vi.fn()} />)
        expect(screen.getByRole("button", { name: "Reset north" })).toHaveAttribute("title", "Reset north")
    })

    it("calls onClick", () => {
        const onClick = vi.fn()
        render(<IconButton icon={<svg />} label="Go" onClick={onClick} />)
        fireEvent.click(screen.getByRole("button", { name: "Go" }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("sets aria-pressed from active", () => {
        const { rerender } = render(<IconButton icon={<svg />} label="Tool" onClick={vi.fn()} active />)
        expect(screen.getByRole("button", { name: "Tool" })).toHaveAttribute("aria-pressed", "true")
        rerender(<IconButton icon={<svg />} label="Tool" onClick={vi.fn()} active={false} />)
        expect(screen.getByRole("button", { name: "Tool" })).toHaveAttribute("aria-pressed", "false")
    })

    it("has no aria-pressed when active is undefined", () => {
        render(<IconButton icon={<svg />} label="Tool" onClick={vi.fn()} />)
        expect(screen.getByRole("button", { name: "Tool" })).not.toHaveAttribute("aria-pressed")
    })

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn()
        render(<IconButton icon={<svg />} label="Go" onClick={onClick} disabled />)
        const button = screen.getByRole("button", { name: "Go" })
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })
})
