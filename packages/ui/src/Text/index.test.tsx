import { declaredStyle, render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { Heading, Text } from "."

describe("Text", () => {
    it("renders children", () => {
        render(<Text>Some words</Text>)
        expect(screen.getByText("Some words")).toBeInTheDocument()
    })

    it("passes the style prop through", () => {
        render(<Text style={{ userSelect: "none" }}>Title</Text>)
        expect(screen.getByText("Title")).toHaveStyle({ userSelect: "none" })
    })

    it("attaches weight, uppercase and tone styling", () => {
        render(
            <Text weight={"semibold"} uppercase tone={"dimmed"}>
                Title
            </Text>,
        )
        // CSS Module rules are injected here but var() tokens are not resolved, so the
        // rendered look is owned by the visual baselines (Text/index.visual.test.tsx).
        const classes = screen.getByText("Title").className
        expect(classes).toContain("weightSemibold")
        expect(classes).toContain("uppercase")
        expect(classes).toContain("dimmed")
    })
})

describe("Text sizes", () => {
    it("is 12px running text on the text line height", () => {
        render(<Text>Some words</Text>)
        const text = screen.getByText("Some words")
        expect(declaredStyle(text, "font-size")).toBe("var(--sphere-font-size-body)")
        expect(declaredStyle(text, "line-height")).toBe("var(--sphere-line-height-text)")
    })

    it("dims with the secondary label colour and warns with the warning colour", () => {
        render(
            <>
                <Text tone="dimmed">dim</Text>
                <Text tone="warning">warn</Text>
            </>,
        )
        expect(declaredStyle(screen.getByText("dim"), "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(screen.getByText("warn"), "color")).toBe("var(--sphere-color-warning)")
    })
})

describe("Heading", () => {
    it("renders a level-3 heading", () => {
        render(<Heading>Properties</Heading>)
        expect(screen.getByRole("heading", { level: 3, name: "Properties" })).toBeInTheDocument()
    })

    it("is 13px bold", () => {
        render(<Heading>Properties</Heading>)
        const heading = screen.getByRole("heading")
        expect(declaredStyle(heading, "font-size")).toBe("var(--sphere-font-size-regular)")
        expect(declaredStyle(heading, "font-weight")).toBe("var(--sphere-font-weight-bold)")
    })
})
