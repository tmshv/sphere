import { page } from "vitest/browser"
import { createRef } from "react"
import { visualCases } from "../visual/visualCases"
import { Popover } from "."

const noop = () => {}
const ANCHOR_TOP_PX = 400
const ANCHOR_LEFT_PX = 300

// The anchor sits low and right, as the status bar button does, so the popover opens above it.
function Subject() {
    const anchor = createRef<HTMLDivElement>()
    return (
        <>
            <div
                ref={anchor}
                style={{ position: "fixed", top: ANCHOR_TOP_PX, left: ANCHOR_LEFT_PX, width: 24, height: 24 }}
            />
            <Popover open anchor={anchor} onClose={noop}>
                <span>Terrain</span>
                <span>Settings</span>
            </Popover>
        </>
    )
}

visualCases("Popover", {
    open: {
        render: () => <Subject />,
        interact: async () => {
            await expect.element(page.getByText("Terrain")).toBeVisible()
        },
        target: "page",
    },
})
