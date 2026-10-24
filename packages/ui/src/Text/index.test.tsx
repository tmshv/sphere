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
        expect(screen.getByText("Title")).toHaveStyle({
            fontWeight: "600",
            textTransform: "uppercase",
            userSelect: "none",
        })
    })
})

describe("Heading", () => {
    it("renders a level-3 heading", () => {
        render(<Heading>Properties</Heading>)
        expect(screen.getByRole("heading", { level: 3, name: "Properties" })).toBeInTheDocument()
    })
})
