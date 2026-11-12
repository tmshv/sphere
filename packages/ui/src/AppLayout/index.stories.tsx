import type { Meta, StoryObj } from "@storybook/react-vite"
import { APP_LAYOUT_FOOTER, APP_LAYOUT_LEFT, APP_LAYOUT_MAIN, APP_LAYOUT_RIGHT } from "../stories/fixtures"
import { APP_LAYOUT_SIDEBAR_SIZE, appLayoutStyle, paneStyle } from "../stories/layout"
import { AppLayout } from "."

const meta = {
    title: "Containers/AppLayout",
    component: AppLayout,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        leftSidebar: <div style={paneStyle}>{APP_LAYOUT_LEFT}</div>,
        rightSidebar: <div style={paneStyle}>{APP_LAYOUT_RIGHT}</div>,
        leftSidebarSize: APP_LAYOUT_SIDEBAR_SIZE,
        rightSidebarSize: APP_LAYOUT_SIDEBAR_SIZE,
        footer: <div style={paneStyle}>{APP_LAYOUT_FOOTER}</div>,
        children: <div style={paneStyle}>{APP_LAYOUT_MAIN}</div>,
    },
    decorators: [
        Story => (
            <div style={appLayoutStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AppLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LeftSidebarOnly: Story = { args: { rightSidebar: undefined } }

export const NoSidebars: Story = { args: { leftSidebar: undefined, rightSidebar: undefined } }
