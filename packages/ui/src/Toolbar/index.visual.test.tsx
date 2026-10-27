import { page, userEvent } from "vitest/browser"
import type { ReactNode } from "react"
import { visualCases } from "../visual/visualCases"
import { Toolbar } from "."

const INSET_PX = 16

// The vertical bar is taller than the fixed-size subject, which clips it. A fixed
// wrapper sits outside the subject's overflow, so the page capture shows every link.
function Uncropped({ children }: { children: ReactNode }) {
    return <div style={{ position: "fixed", top: INSET_PX, left: INSET_PX }}>{children}</div>
}

visualCases("Toolbar", {
    vertical: {
        render: () => (
            <Uncropped>
                <Toolbar />
            </Uncropped>
        ),
        target: "page",
    },
    horizontal: { render: () => <Toolbar horizontal /> },
    tooltip: {
        render: () => (
            <Uncropped>
                <Toolbar />
            </Uncropped>
        ),
        interact: async () => {
            await userEvent.hover(page.getByRole("button").first())
            await expect.element(page.getByText("Home")).toBeVisible()
        },
        target: "page",
    },
})
