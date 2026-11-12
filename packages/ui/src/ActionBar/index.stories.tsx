import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ACTION_BAR_ITEMS } from "../stories/fixtures"
import { ActionBar } from "."

const meta = {
    title: "Controls/ActionBar",
    component: ActionBar,
    tags: ["autodocs"],
    args: { items: ACTION_BAR_ITEMS, onClick: fn(), padded: false },
} satisfies Meta<typeof ActionBar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Padded: Story = { args: { padded: true } }
