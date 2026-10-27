import { page, userEvent } from "vitest/browser"
import { visualCases } from "../visual/visualCases"
import { Tooltip } from "./Tooltip"

const TARGET_LABEL = "Target"
const PADDING = "56px 96px"
// Mantine places the tooltip at fractional pixels (121.44px); Base UI rounds to whole pixels.
// The box is identical and only the glyph anti-aliasing inside it differs, about 100 pixels.
const ROUNDED_POSITION_TOLERANCE = 0.0005

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
        allowedMismatchedPixelRatio: ROUNDED_POSITION_TOLERANCE,
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
        allowedMismatchedPixelRatio: ROUNDED_POSITION_TOLERANCE,
    },
    arrow: {
        render: () => (
            <div style={{ padding: PADDING }}>
                <Tooltip label="Copied!" arrow>
                    {target}
                </Tooltip>
            </div>
        ),
        interact: hoverTarget("Copied!"),
        target: "page",
        allowedMismatchedPixelRatio: ROUNDED_POSITION_TOLERANCE,
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
        allowedMismatchedPixelRatio: ROUNDED_POSITION_TOLERANCE,
    },
})
