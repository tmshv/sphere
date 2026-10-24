import { render, screen } from "../test-utils"
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
        // The unit environment applies no CSS; the rendered look is owned by the
        // visual baselines (Text/index.visual.test.tsx).
        const classes = screen.getByText("Title").className
        expect(classes).toContain("weightSemibold")
        expect(classes).toContain("uppercase")
        expect(classes).toContain("dimmed")
    })
})

describe("Heading", () => {
    it("renders a level-3 heading", () => {
        render(<Heading>Properties</Heading>)
        expect(screen.getByRole("heading", { level: 3, name: "Properties" })).toBeInTheDocument()
    })
})
