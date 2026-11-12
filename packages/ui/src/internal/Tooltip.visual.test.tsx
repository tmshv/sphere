import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { Tooltip } from "./Tooltip"

const TARGET_LABEL = "Target"
const PADDING = "56px 96px"

const target = <button type="button">{TARGET_LABEL}</button>

function hoverTarget(label: string) {
    return async () => {
        await userEvent.hover(page.getByRole("button", { name: TARGET_LABEL }))
        await expect.element(page.getByText(label)).toBeVisible()
    }
}

visualCases("InternalTooltip", {
    top: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <Tooltip label="Copy">{target}</Tooltip>
            </div>
        ),
        interact: hoverTarget("Copy"),
        target: "page",
    },
    "right-no-transition": {
        render: () => (
            <div style={{ padding: PADDING }}>
                <Tooltip label="Reset north" side="right" duration={0}>
                    {target}
                </Tooltip>
            </div>
        ),
        interact: hoverTarget("Reset north"),
        target: "page",
    },
    delayed: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <Tooltip label="https://example.com/a/long/path" delay={500}>
                    {target}
                </Tooltip>
            </div>
        ),
        interact: hoverTarget("https://example.com/a/long/path"),
        target: "page",
    },
})
