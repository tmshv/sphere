import { describe, expect, it } from "vitest"
import { render, screen } from "../test-utils"
import { AppLayout } from "."

describe("AppLayout", () => {
    it("renders the body and the footer", () => {
        render(
            <AppLayout footer={<div>status</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("map")).toBeInTheDocument()
        expect(screen.getByText("status")).toBeInTheDocument()
    })

    it("renders both sidebars when given", () => {
        render(
            <AppLayout footer={<div>status</div>} leftSidebar={<div>left</div>} rightSidebar={<div>right</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("left")).toBeInTheDocument()
        expect(screen.getByText("right")).toBeInTheDocument()
    })

    it("omits a sidebar that is not given", () => {
        render(
            <AppLayout footer={<div>status</div>} leftSidebar={<div>left</div>}>
                <div>map</div>
            </AppLayout>,
        )

        expect(screen.getByText("left")).toBeInTheDocument()
        expect(screen.queryByText("right")).not.toBeInTheDocument()
    })
})
