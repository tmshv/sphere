import type { Meta, StoryObj } from "@storybook/react-vite"
import { SIDEBAR_TEXT } from "../stories/fixtures"
import { sidebarFrameStyle } from "../stories/layout"
import { Sidebar } from "."

const meta = {
    title: "Containers/Sidebar",
    component: Sidebar,
    tags: ["autodocs"],
    args: { children: SIDEBAR_TEXT },
    decorators: [
        Story => (
            <div style={sidebarFrameStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
