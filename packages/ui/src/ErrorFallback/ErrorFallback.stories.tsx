import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ERROR_MESSAGE } from "../stories/fixtures"
import { appLayoutStyle, sidebarFrameStyle } from "../stories/layout"
import { ErrorFallback } from "."

const VARIANTS: ReadonlyArray<"fullscreen" | "sidebar"> = ["fullscreen", "sidebar"]

const meta = {
    title: "Containers/ErrorFallback",
    component: ErrorFallback,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        variant: "fullscreen",
        error: new Error(ERROR_MESSAGE),
        resetErrorBoundary: fn(),
    },
    argTypes: { variant: { control: "radio", options: VARIANTS } },
    decorators: [
        Story => (
            <div style={appLayoutStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ErrorFallback>

export default meta

type Story = StoryObj<typeof meta>

export const Fullscreen: Story = {}

export const Sidebar: Story = {
    args: { variant: "sidebar" },
    decorators: [
        Story => (
            <div style={sidebarFrameStyle}>
                <Story />
            </div>
        ),
    ],
}
