import { act, fireEvent, render, screen } from "../test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CopyButton } from "./CopyButton"

beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        writable: true,
        configurable: true,
    })
})

describe("CopyButton", () => {
    it("renders a button", () => {
        render(<CopyButton value="hello" />)
        expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("calls clipboard.writeText with value on click", () => {
        render(<CopyButton value="test-value" />)
        fireEvent.click(screen.getByRole("button"))
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test-value")
    })

    it("shows check icon after click", () => {
        render(<CopyButton value="hello" />)
        fireEvent.click(screen.getByRole("button"))
        expect(document.querySelector("svg")).toBeInTheDocument()
    })

    it("reverts to initial class after 1500ms", () => {
        vi.useFakeTimers()
        render(<CopyButton value="hello" />)
        const button = screen.getByRole("button")

        const initialClass = button.className

        fireEvent.click(button)
        expect(button.className).not.toBe(initialClass)

        act(() => {
            vi.advanceTimersByTime(1500)
        })
        expect(button.className).toBe(initialClass)

        vi.useRealTimers()
    })
})
