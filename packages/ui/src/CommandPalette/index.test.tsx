import { act, fireEvent, render, screen } from "../test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CommandPalette } from "."

// Opening or closing the palette starts a Mantine transition whose 10ms
// pre-state timer survives unmount. Let it fire while the DOM still exists,
// or it throws "window is not defined" after the environment is torn down.
const TRANSITION_SETTLE_MS = 20

afterEach(async () => {
    await act(() => new Promise(resolve => setTimeout(resolve, TRANSITION_SETTLE_MS)))
})

const SHORTCUT = "mod + p"
const PLACEHOLDER = "Search..."
const EMPTY_MESSAGE = "Nothing found..."

function renderPalette(onTrigger = vi.fn()) {
    render(
        <CommandPalette
            commands={[
                { id: "zen", title: "Toggle Zen", description: "Zen mode", onTrigger },
                { id: "globe", title: "Globe", onTrigger: vi.fn() },
            ]}
            shortcut={SHORTCUT}
            placeholder={PLACEHOLDER}
            emptyMessage={EMPTY_MESSAGE}
        >
            <div>content</div>
        </CommandPalette>,
    )
    fireEvent.keyDown(document.documentElement, { key: "p", ctrlKey: true })
}

describe("CommandPalette", () => {
    it("opens on its shortcut and lists command titles", async () => {
        renderPalette()
        expect(await screen.findByText("Toggle Zen")).toBeDefined()
        expect(screen.getByText("Globe")).toBeDefined()
    })

    it("filters by typed text and shows emptyMessage", async () => {
        renderPalette()
        const input = await screen.findByPlaceholderText(PLACEHOLDER)
        fireEvent.change(input, { target: { value: "zen" } })
        expect(screen.queryByText("Globe")).toBeNull()
        fireEvent.change(input, { target: { value: "zzzz" } })
        expect(screen.getByText(EMPTY_MESSAGE)).toBeDefined()
    })

    it("runs onTrigger of the chosen command", async () => {
        const onTrigger = vi.fn()
        renderPalette(onTrigger)
        fireEvent.click(await screen.findByText("Toggle Zen"))
        expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it("runs the current onTrigger after commands change", async () => {
        const first = vi.fn()
        const second = vi.fn()
        function palette(onTrigger: () => void) {
            return (
                <CommandPalette
                    commands={[{ id: "zen", title: "Toggle Zen", onTrigger }]}
                    shortcut={SHORTCUT}
                    placeholder={PLACEHOLDER}
                    emptyMessage={EMPTY_MESSAGE}
                >
                    <div>content</div>
                </CommandPalette>
            )
        }
        const { rerender } = render(palette(first))
        rerender(palette(second))
        fireEvent.keyDown(document.documentElement, { key: "p", ctrlKey: true })
        fireEvent.click(await screen.findByText("Toggle Zen"))
        expect(second).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
    })
})
