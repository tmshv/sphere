import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "../Button"
import { BUTTON_LABEL, TOOLTIP_LABEL } from "../stories/fixtures"
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
        disabled: false,
        children: <Button>{BUTTON_LABEL}</Button>,
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
        await expect(await body.findByRole("tooltip")).toBeVisible()
    },
}

export const WithArrow: Story = {
    args: { arrow: true, side: "right" },
    play: Default.play,
}
