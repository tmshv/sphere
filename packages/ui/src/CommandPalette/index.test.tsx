import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "../test-utils"
import { CommandPalette } from "."

const SHORTCUT = "mod + p"
const PLACEHOLDER = "Search..."
const EMPTY_MESSAGE = "Nothing found..."

function palette(onTrigger = vi.fn(), other = vi.fn()) {
    return (
        <CommandPalette
            commands={[
                { id: "zen", title: "Toggle Zen", description: "Fullscreen mode", onTrigger },
                { id: "globe", title: "Globe", onTrigger: other },
                { id: "fit", title: "Zoom", description: "Toggle the map extent", onTrigger: other },
            ]}
            shortcut={SHORTCUT}
            placeholder={PLACEHOLDER}
            emptyMessage={EMPTY_MESSAGE}
        >
            <div>content</div>
        </CommandPalette>
    )
}

function openPalette() {
    fireEvent.keyDown(document.documentElement, { key: "p", ctrlKey: true })
}

function titles(): string[] {
    return screen.getAllByRole("option").map(option => option.textContent ?? "")
}

describe("CommandPalette", () => {
    it("is closed until its shortcut is pressed, then lists commands", async () => {
        render(palette())
        expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
        openPalette()
        expect(await screen.findByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
        expect(screen.getByText("Toggle Zen")).toBeInTheDocument()
        expect(screen.getByText("Globe")).toBeInTheDocument()
    })

    it("filters by title first, then description, and shows emptyMessage", async () => {
        render(palette())
        openPalette()
        const input = await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.type(input, "toggle")
        expect(titles()).toEqual(["Toggle ZenFullscreen mode", "ZoomToggle the map extent"])
        expect(screen.queryByText("Globe")).toBeNull()
        await userEvent.clear(input)
        await userEvent.type(input, "fullscreen")
        expect(screen.getByText("Toggle Zen")).toBeInTheDocument()
        expect(screen.queryByText("Zoom")).toBeNull()
        await userEvent.clear(input)
        await userEvent.type(input, "zzzz")
        expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument()
    })

    it("shows no emptyMessage while the query is blank", async () => {
        render(palette())
        openPalette()
        await screen.findByPlaceholderText(PLACEHOLDER)
        expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull()
    })

    it("selects nothing on open, then the first match after typing", async () => {
        render(palette())
        openPalette()
        const input = await screen.findByPlaceholderText(PLACEHOLDER)
        for (const option of screen.getAllByRole("option")) {
            expect(option).not.toHaveAttribute("data-highlighted")
        }
        await userEvent.type(input, "o")
        expect(screen.getAllByRole("option")[0]).toHaveAttribute("data-highlighted")
    })

    it("runs the chosen command with Enter after ArrowDown and closes", async () => {
        const onTrigger = vi.fn()
        const other = vi.fn()
        render(palette(onTrigger, other))
        openPalette()
        await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}")
        expect(onTrigger).toHaveBeenCalledTimes(1)
        expect(other).not.toHaveBeenCalled()
        await waitFor(() => expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull())
    })

    it("runs the command Enter picks after typing", async () => {
        const onTrigger = vi.fn()
        render(palette(onTrigger))
        openPalette()
        const input = await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.type(input, "zen{Enter}")
        expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it("runs onTrigger on click and closes", async () => {
        const onTrigger = vi.fn()
        render(palette(onTrigger))
        openPalette()
        await userEvent.click(await screen.findByText("Toggle Zen"))
        expect(onTrigger).toHaveBeenCalledTimes(1)
        await waitFor(() => expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull())
    })

    it("closes on Escape", async () => {
        render(palette())
        openPalette()
        await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull())
    })

    it("does not open from inside a text input", async () => {
        render(
            <CommandPalette commands={[]} shortcut={SHORTCUT} placeholder={PLACEHOLDER} emptyMessage={EMPTY_MESSAGE}>
                <input aria-label="outside field" />
            </CommandPalette>,
        )
        fireEvent.keyDown(screen.getByLabelText("outside field"), { key: "p", ctrlKey: true })
        expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull()
    })

    it("runs the current onTrigger after commands change", async () => {
        const first = vi.fn()
        const second = vi.fn()
        const { rerender } = render(palette(first))
        rerender(palette(second))
        openPalette()
        await userEvent.click(await screen.findByText("Toggle Zen"))
        expect(second).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
    })

    it("does nothing on Enter while nothing is highlighted", async () => {
        const onTrigger = vi.fn()
        const other = vi.fn()
        render(palette(onTrigger, other))
        openPalette()
        await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.keyboard("{Enter}")
        expect(onTrigger).not.toHaveBeenCalled()
        expect(other).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
    })

    it("selects the last item on ArrowUp from nothing and wraps in both directions", async () => {
        render(palette())
        openPalette()
        await screen.findByPlaceholderText(PLACEHOLDER)
        const highlighted = () => screen.getAllByRole("option").findIndex(o => o.hasAttribute("data-highlighted"))
        await userEvent.keyboard("{ArrowUp}")
        expect(highlighted()).toBe(2)
        await userEvent.keyboard("{ArrowDown}")
        expect(highlighted()).toBe(0)
        await userEvent.keyboard("{ArrowUp}")
        expect(highlighted()).toBe(2)
    })

    it("closes on the first Escape even with a query", async () => {
        render(palette())
        openPalette()
        const input = await screen.findByPlaceholderText(PLACEHOLDER)
        await userEvent.type(input, "zen")
        await userEvent.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull())
    })
})
