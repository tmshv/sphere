import { IconMap } from "@sphere/icons"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { STATUSBAR_BUTTON_LABEL } from "../stories/fixtures"
import { STATUSBAR_ICON_SIZE } from "../stories/layout"
import { Statusbar, StatusbarButton } from "."

const meta = {
    title: "Statusbar/StatusbarButton",
    component: StatusbarButton,
    tags: ["autodocs"],
    args: {
        icon: <IconMap size={STATUSBAR_ICON_SIZE} />,
        label: STATUSBAR_BUTTON_LABEL,
        onClick: fn(),
        disabled: false,
        active: false,
    },
    decorators: [
        Story => (
            <Statusbar>
                <Story />
            </Statusbar>
        ),
    ],
} satisfies Meta<typeof StatusbarButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { active: true } }

export const Disabled: Story = { args: { disabled: true } }

export const DisabledActive: Story = { args: { disabled: true, active: true } }
