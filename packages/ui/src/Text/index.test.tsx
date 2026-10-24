import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { Heading, Text } from "."

describe("Text", () => {
    it("renders children", () => {
        render(<Text>Some words</Text>)
        expect(screen.getByText("Some words")).toBeInTheDocument()
    })

    it("applies weight, uppercase and style", () => {
        render(
            <Text weight={"semibold"} uppercase style={{ userSelect: "none" }}>
                Title
            </Text>,
        )
        const text = screen.getByText("Title")
        expect(text.className).toContain("weightSemibold")
        expect(text.className).toContain("uppercase")
        expect(text).toHaveStyle({ userSelect: "none" })
    })

    it("applies the tone", () => {
        render(<Text tone={"dimmed"}>Quiet</Text>)
        expect(screen.getByText("Quiet").className).toContain("dimmed")
    })
})

describe("Heading", () => {
    it("renders a level-3 heading", () => {
        render(<Heading>Properties</Heading>)
        expect(screen.getByRole("heading", { level: 3, name: "Properties" })).toBeInTheDocument()
    })
})
