import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import {
    BUTTON_LABEL,
    TOOLTIP_CLOSE_DELAY_MS,
    TOOLTIP_DELAY_MS,
    TOOLTIP_DESKTOP_DELAY_MS,
    TOOLTIP_DURATION_MS,
    TOOLTIP_LABEL,
} from "../stories/fixtures"
import { tooltipTriggerStyle } from "../stories/layout"
import { Tooltip, type TooltipSide } from "./Tooltip"

const SIDES: ReadonlyArray<TooltipSide> = ["top", "right", "bottom", "left"]
// Long enough for the desktop delay to pass.
const OPEN_WAIT_MARGIN_MS = 1000
const OPEN_WAIT_MS = TOOLTIP_DESKTOP_DELAY_MS + OPEN_WAIT_MARGIN_MS

const meta = {
    title: "Menus/Tooltip",
    component: Tooltip,
    tags: ["autodocs"],
    args: {
        label: TOOLTIP_LABEL,
        side: "top",
        delay: TOOLTIP_DELAY_MS,
        closeDelay: TOOLTIP_CLOSE_DELAY_MS,
        duration: TOOLTIP_DURATION_MS,
        disabled: false,
        children: <button type="button">{BUTTON_LABEL}</button>,
    },
    argTypes: { side: { control: "radio", options: SIDES } },
    decorators: [
        Story => (
            <div style={tooltipTriggerStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.hover(within(canvasElement).getByRole("button"))
        const body = within(canvasElement.ownerDocument.body)
        const tooltip = await body.findByRole("tooltip")
        await waitFor(() => expect(tooltip).toBeVisible())
    },
}

// The desktop default: the tooltip waits before it opens.
export const DesktopDelay: Story = {
    args: { delay: TOOLTIP_DESKTOP_DELAY_MS, side: "right" },
    play: async ({ canvasElement }) => {
        await userEvent.hover(within(canvasElement).getByRole("button"))
        const body = within(canvasElement.ownerDocument.body)
        const tooltip = await body.findByRole("tooltip", {}, { timeout: OPEN_WAIT_MS })
        await waitFor(() => expect(tooltip).toBeVisible())
    },
}
