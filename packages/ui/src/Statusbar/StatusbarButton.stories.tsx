import { IconMap } from "@sphere/icons"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { STATUSBAR_BUTTON_LABEL } from "../stories/fixtures"
import { STATUSBAR_ICON_SIZE } from "../stories/layout"
import { Statusbar, StatusbarButton, type StatusbarButtonLook } from "."

const LOOKS: ReadonlyArray<StatusbarButtonLook> = ["accent", "fill"]

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
        activeLook: "accent",
    },
    argTypes: {
        activeLook: { control: "radio", options: LOOKS },
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

export const ActiveFill: Story = { args: { active: true, activeLook: "fill" } }

export const Disabled: Story = { args: { disabled: true } }

export const DisabledActive: Story = { args: { disabled: true, active: true } }
