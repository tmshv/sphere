import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import {
    BUTTON_LABEL,
    TOOLTIP_CLOSE_DELAY_MS,
    TOOLTIP_DELAY_MS,
    TOOLTIP_DURATION_MS,
    TOOLTIP_LABEL,
} from "../stories/fixtures"
import { tooltipTriggerStyle } from "../stories/layout"
import { Tooltip, type TooltipSide } from "./Tooltip"

const SIDES: ReadonlyArray<TooltipSide> = ["top", "right", "bottom", "left"]

const meta = {
    title: "Menus/Tooltip",
    component: Tooltip,
    tags: ["autodocs"],
    args: {
        label: TOOLTIP_LABEL,
        side: "top",
        arrow: false,
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

export const WithArrow: Story = {
    args: { arrow: true, side: "right" },
    play: Default.play,
}
