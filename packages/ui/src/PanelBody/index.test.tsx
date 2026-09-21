import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { PanelBody } from "."

function styleOf(element: Element) {
    return window.getComputedStyle(element)
}

describe("PanelBody", () => {
    it("keeps the header out of the scrolling area", () => {
        render(
            <PanelBody header={<button type={"button"}>Delete</button>}>
                <div>body</div>
            </PanelBody>,
        )
        const header = screen.getByRole("button", { name: "Delete" }).parentElement
        if (!header) {
            throw new Error("header not found")
        }
        const style = styleOf(header)

        expect(style.flexShrink).toBe("0")
        expect(style.overflowY).not.toBe("auto")
    })

    it("scrolls the body", () => {
        render(
            <PanelBody header={<button type={"button"}>Delete</button>}>
                <div>body</div>
            </PanelBody>,
        )
        const body = screen.getByText("body").parentElement
        if (!body) {
            throw new Error("body not found")
        }
        const style = styleOf(body)

        expect(style.overflowY).toBe("auto")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
    })

    it("scrolls the body when there is no header", () => {
        const { container } = render(
            <PanelBody>
                <div>body</div>
            </PanelBody>,
        )
        const root = container.firstElementChild
        if (!root) {
            throw new Error("root not found")
        }
        const body = screen.getByText("body").parentElement

        expect(root.childElementCount).toBe(1)
        expect(body && styleOf(body).overflowY).toBe("auto")
    })

    it("insets its content from inside the part that scrolls", () => {
        render(
            <PanelBody header={<button type={"button"}>Delete</button>}>
                <div>body</div>
            </PanelBody>,
        )
        const body = screen.getByText("body").parentElement
        const header = screen.getByRole("button", { name: "Delete" }).parentElement
        if (!body || !header) {
            throw new Error("panel parts not found")
        }

        // Padding outside the scrolling element would leave the overlay
        // scrollbar macOS draws sitting on top of the text rather than the gap.
        expect(Number.parseFloat(styleOf(body).paddingRight)).toBeGreaterThan(0)
        expect(Number.parseFloat(styleOf(body).paddingLeft)).toBeGreaterThan(0)
        // The header does not scroll, but it has to line up with the body.
        expect(styleOf(header).paddingLeft).toBe(styleOf(body).paddingLeft)
    })

    it("fills its parent without overflowing it", () => {
        const { container } = render(
            <PanelBody>
                <div>body</div>
            </PanelBody>,
        )
        const root = container.firstElementChild
        if (!root) {
            throw new Error("root not found")
        }
        const style = styleOf(root)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
    })
})
