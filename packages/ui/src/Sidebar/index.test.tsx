import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
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
