import type { Meta, StoryObj } from "@storybook/react-vite"
import { SURFACE_TEXT } from "../stories/fixtures"
import { panelFrameStyle } from "../stories/layout"
import { Surface } from "."

const meta = {
    title: "Containers/Surface",
    component: Surface,
    tags: ["autodocs"],
    args: { style: undefined, children: SURFACE_TEXT },
} satisfies Meta<typeof Surface>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Styled: Story = { args: { style: panelFrameStyle } }
