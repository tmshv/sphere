import { describe, expect, it } from "vitest"
import { declaredStyle, render, screen } from "../test-utils"
import { Sidebar } from "."

describe("Sidebar", () => {
    it("renders its children", () => {
        render(
            <Sidebar>
                <div>panel</div>
            </Sidebar>,
        )

        expect(screen.getByText("panel")).toBeInTheDocument()
    })
})

describe("Sidebar look", () => {
    it("sits on the sidebar colour", () => {
        render(
            <Sidebar>
                <div>panel</div>
            </Sidebar>,
        )
        const container = screen.getByText("panel").parentElement
        if (!container) {
            throw new Error("sidebar not found")
        }

        expect(declaredStyle(container, "background-color")).toBe("var(--sphere-color-sidebar)")
    })
})
