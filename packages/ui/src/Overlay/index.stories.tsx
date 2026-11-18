import type { Meta, StoryObj } from "@storybook/react-vite"
import { OVERLAY_SLOTS } from "../stories/fixtures"
import { overlayFrameStyle } from "../stories/layout"
import { Overlay } from "."

const meta = {
    title: "Containers/Overlay",
    component: Overlay,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: { ...OVERLAY_SLOTS },
    decorators: [
        Story => (
            <div style={overlayFrameStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Overlay>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Corners: Story = {
    args: { left: undefined, right: undefined, top: undefined, bottom: undefined },
}
