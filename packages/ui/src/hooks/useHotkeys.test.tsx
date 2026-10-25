import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { parseHotkey } from "./parseHotkey"
import { useHotkeys } from "./useHotkeys"

function Probe({ handler, hotkey = "mod+V" }: { handler: (event: KeyboardEvent) => void; hotkey?: string }) {
    useHotkeys([[hotkey, handler]])
    return (
        <div>
            <input aria-label="field" />
            <textarea aria-label="notes" />
            <select aria-label="choice" />
            <div data-testid="editable" />
            <button type="button">plain</button>
        </div>
    )
}

describe("parseHotkey", () => {
    it("reads mod+V and mod + p", () => {
        expect(parseHotkey("mod+V")).toEqual({ key: "v", mod: true, shift: false, alt: false })
        expect(parseHotkey("mod + p")).toEqual({ key: "p", mod: true, shift: false, alt: false })
    })

    it("reads shift and alt modifiers and a bare key", () => {
        expect(parseHotkey("shift+alt+K")).toEqual({ key: "k", mod: false, shift: true, alt: true })
        expect(parseHotkey("/")).toEqual({ key: "/", mod: false, shift: false, alt: false })
    })
})

describe("useHotkeys", () => {
    it("fires for ctrl and for meta when the hotkey uses mod", () => {
        const handler = vi.fn()
        render(<Probe handler={handler} />)
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true })
        fireEvent.keyDown(document.documentElement, { key: "v", metaKey: true })
        expect(handler).toHaveBeenCalledTimes(2)
    })

    it("matches the physical key when the typed character differs", () => {
        const handler = vi.fn()
        render(<Probe handler={handler} />)
        fireEvent.keyDown(document.documentElement, { key: "м", code: "KeyV", ctrlKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("does not fire without the modifier or with extra modifiers", () => {
        const handler = vi.fn()
        render(<Probe handler={handler} />)
        fireEvent.keyDown(document.documentElement, { key: "v" })
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true, shiftKey: true })
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true, altKey: true })
        expect(handler).not.toHaveBeenCalled()
    })

    it("does not fire a plain hotkey while ctrl or meta is held", () => {
        const handler = vi.fn()
        render(<Probe handler={handler} hotkey="/" />)
        fireEvent.keyDown(document.documentElement, { key: "/", ctrlKey: true })
        fireEvent.keyDown(document.documentElement, { key: "/", metaKey: true })
        expect(handler).not.toHaveBeenCalled()
        fireEvent.keyDown(document.documentElement, { key: "/" })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("ignores events from inputs, textareas and selects", () => {
        const handler = vi.fn()
        const view = render(<Probe handler={handler} />)
        for (const label of ["field", "notes", "choice"]) {
            fireEvent.keyDown(view.getByLabelText(label), { key: "v", ctrlKey: true })
        }
        expect(handler).not.toHaveBeenCalled()
        fireEvent.keyDown(view.getByRole("button", { name: "plain" }), { key: "v", ctrlKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("ignores events from contentEditable elements", () => {
        const handler = vi.fn()
        const view = render(<Probe handler={handler} />)
        const editable = view.getByTestId("editable")
        Object.defineProperty(editable, "isContentEditable", { value: true })
        fireEvent.keyDown(editable, { key: "v", ctrlKey: true })
        expect(handler).not.toHaveBeenCalled()
    })

    it("prevents the default action of a handled key", () => {
        const handler = vi.fn()
        render(<Probe handler={handler} />)
        const handled = fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true })
        const unhandled = fireEvent.keyDown(document.documentElement, { key: "x", ctrlKey: true })
        expect(handled).toBe(false)
        expect(unhandled).toBe(true)
    })

    it("stops listening after unmount and uses the latest handler", () => {
        const first = vi.fn()
        const second = vi.fn()
        const view = render(<Probe handler={first} />)
        view.rerender(<Probe handler={second} />)
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true })
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
        view.unmount()
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true })
        expect(second).toHaveBeenCalledTimes(1)
    })
})
