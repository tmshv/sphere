// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { Overlay } from "."

function getRegion(testId: string) {
    const content = screen.getByTestId(testId)
    const region = content.parentElement
    if (!region) {
        throw new Error(`region wrapper for ${testId} not found`)
    }
    return region
}

describe("Overlay", () => {
    it("renders only the provided regions", () => {
        render(<Overlay topRight={<div data-testid="tr">tr</div>} />)
        expect(screen.getByTestId("tr")).toBeInTheDocument()
        expect(screen.queryByTestId("b")).not.toBeInTheDocument()
    })

    it("keeps the root container transparent to the mouse", () => {
        render(<Overlay topRight={<div data-testid="tr">tr</div>} />)
        const container = getRegion("tr").parentElement
        if (!container) {
            throw new Error("container not found")
        }
        expect(window.getComputedStyle(container).pointerEvents).toBe("none")
    })

    it.each([
        "topLeft",
        "topRight",
        "left",
        "right",
        "top",
        "bottom",
    ] as const)("%s region wrapper does not capture mouse events, its content does", region => {
        render(<Overlay {...{ [region]: <div data-testid="content">content</div> }} />)
        const wrapper = getRegion("content")
        expect(window.getComputedStyle(wrapper).pointerEvents).toBe("none")
        expect(window.getComputedStyle(screen.getByTestId("content")).pointerEvents).toBe("auto")
    })

    it.each([
        "topLeft",
        "topRight",
    ] as const)("%s region is bounded by max-height, not stretched to full height", region => {
        render(<Overlay {...{ [region]: <div data-testid="content">content</div> }} />)
        const style = window.getComputedStyle(getRegion("content"))
        expect(["", "auto"]).toContain(style.bottom)
        expect(style.maxHeight).not.toBe("none")
    })
})
