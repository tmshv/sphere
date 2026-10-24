import { Tooltip as MantineTooltip } from "@mantine/core"
import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"

const TARGET_LABEL = "Target"
const PADDING = "56px 96px"

const target = <button type="button">{TARGET_LABEL}</button>

async function hoverTarget() {
    await userEvent.hover(page.getByRole("button", { name: TARGET_LABEL }))
    await expect.element(page.getByRole("tooltip")).toBeVisible()
}

visualCases("InternalTooltip", {
    top: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <MantineTooltip label="Copy">
                    {target}
                </MantineTooltip>
            </div>
        ),
        interact: hoverTarget,
        target: "page",
    },
    "right-no-transition": {
        render: () => (
            <div style={{ padding: PADDING }}>
                <MantineTooltip label="Reset north" position="right" transitionDuration={0}>
                    {target}
                </MantineTooltip>
            </div>
        ),
        interact: hoverTarget,
        target: "page",
    },
    arrow: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <MantineTooltip label="Copied!" withArrow>
                    {target}
                </MantineTooltip>
            </div>
        ),
        interact: hoverTarget,
        target: "page",
    },
    delayed: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <MantineTooltip label="https://example.com/a/long/path" openDelay={500}>
                    {target}
                </MantineTooltip>
            </div>
        ),
        interact: hoverTarget,
        target: "page",
    },
})
