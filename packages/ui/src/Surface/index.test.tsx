import { render, screen } from "../test-utils"
import { describe, expect, it } from "vitest"
import { Surface } from "."

describe("Surface", () => {
    it("renders children and passes style through", () => {
        render(
            <Surface style={{ minWidth: 300 }}>
                <span>panel body</span>
            </Surface>,
        )
        expect(screen.getByText("panel body")).toBeInTheDocument()
        expect(screen.getByText("panel body").parentElement).toHaveStyle({ minWidth: "300px" })
    })
})
