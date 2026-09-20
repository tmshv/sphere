import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { Sidebar } from "."

describe("Sidebar", () => {
    it("renders its children", () => {
        render(
            <Sidebar startWidth={300} minWidth={265} maxWidth={500}>
                <div>panel</div>
            </Sidebar>,
        )

        expect(screen.getByText("panel")).toBeInTheDocument()
    })
})
