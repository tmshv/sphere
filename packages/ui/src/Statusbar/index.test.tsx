import { render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { Statusbar } from "."

describe("Statusbar", () => {
    it("renders children", () => {
        render(
            <Statusbar>
                <span>v1.0.0</span>
                <span>3 sources</span>
            </Statusbar>,
        )
        expect(screen.getByText("v1.0.0")).toBeInTheDocument()
        expect(screen.getByText("3 sources")).toBeInTheDocument()
    })
})
