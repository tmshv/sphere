import type { Meta, StoryObj } from "@storybook/react-vite"
import { sidebarColumnStyle } from "../layout"
import { SidebarContent } from "./SidebarContent"

const meta = {
    title: "Compositions/SourcesSidebar",
    component: SidebarContent,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    decorators: [
        Story => (
            <div style={sidebarColumnStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SidebarContent>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
