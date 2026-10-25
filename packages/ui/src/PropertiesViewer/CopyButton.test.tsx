import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "../test-utils"
import { CopyButton } from "./CopyButton"

const FEEDBACK_MS = 1500

function mockClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn(writeText) },
        writable: true,
        configurable: true,
    })
}

async function click() {
    await act(async () => {
        fireEvent.click(screen.getByRole("button"))
    })
}

beforeEach(() => {
    vi.useFakeTimers()
    mockClipboard(() => Promise.resolve())
})

afterEach(() => {
    vi.useRealTimers()
})

describe("CopyButton", () => {
    it("renders a button", () => {
        render(<CopyButton value="hello" />)
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument()
    })

    it("calls clipboard.writeText with value on click", async () => {
        render(<CopyButton value="test-value" />)
        await click()
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test-value")
    })

    it("shows Copied once the clipboard accepts the text", async () => {
        render(<CopyButton value="hello" />)
        await click()
        expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument()
    })

    it("reverts to initial class after 1500ms", async () => {
        render(<CopyButton value="hello" />)
        const button = screen.getByRole("button")
        const initialClass = button.className

        await click()
        expect(button.className).not.toBe(initialClass)

        act(() => {
            vi.advanceTimersByTime(FEEDBACK_MS)
        })
        expect(button.className).toBe(initialClass)
    })

    it("never claims Copied when the clipboard refuses", async () => {
        mockClipboard(() => Promise.reject(new Error("denied")))
        render(<CopyButton value="hello" />)
        await click()

        expect(screen.queryByRole("button", { name: "Copied!" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Copy failed" })).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(FEEDBACK_MS)
        })
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument()
    })

    it("clears its timer on unmount", async () => {
        const { unmount } = render(<CopyButton value="hello" />)
        await click()
        expect(vi.getTimerCount()).toBeGreaterThan(0)

        unmount()
        expect(vi.getTimerCount()).toBe(0)
    })
})
