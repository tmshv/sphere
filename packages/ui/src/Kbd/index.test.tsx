import { describe, expect, it } from "vitest"
import { declaredStyle, render, screen } from "../test-utils"
import { Kbd, KbdShortcut } from "."

describe("Kbd", () => {
    it("renders the key in a kbd element", () => {
        render(<Kbd>Esc</Kbd>)
        const key = screen.getByText("Esc")
        expect(key.tagName).toBe("KBD")
    })

    it("draws a key cap: control body, hairline border, control radius, small secondary text", () => {
        render(<Kbd>K</Kbd>)
        const key = screen.getByText("K")
        expect(declaredStyle(key, "background-color")).toBe("var(--sphere-color-control)")
        expect(declaredStyle(key, "border-color")).toBe("var(--sphere-color-control-border)")
        expect(declaredStyle(key, "border-width")).toBe("var(--sphere-hairline)")
        expect(declaredStyle(key, "border-radius")).toBe("var(--sphere-radius-control)")
        expect(declaredStyle(key, "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(key, "font-size")).toBe("var(--sphere-font-size-small)")
        expect(declaredStyle(key, "cursor")).toBe("default")
    })
})

describe("KbdShortcut", () => {
    it("renders each key as a cap inside one kbd for the combination, in order", () => {
        const { container } = render(<KbdShortcut keys={["⌘", "⇧", "K"]} />)
        const combination = container.firstElementChild
        expect(combination?.tagName).toBe("KBD")
        const caps = Array.from(combination?.children ?? [])
        expect(caps.map(cap => cap.tagName)).toEqual(["KBD", "KBD", "KBD"])
        expect(caps.map(cap => cap.textContent)).toEqual(["⌘", "⇧", "K"])
    })

    it("keeps a repeated key", () => {
        render(<KbdShortcut keys={["G", "G"]} />)
        expect(screen.getAllByText("G")).toHaveLength(2)
    })

    it("renders nothing for no keys", () => {
        const { container } = render(<KbdShortcut keys={[]} />)
        expect(container).toBeEmptyDOMElement()
    })
})
