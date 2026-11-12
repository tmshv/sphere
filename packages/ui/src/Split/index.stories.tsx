import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SPLIT_LEFT, SPLIT_RIGHT } from "../stories/fixtures"
import { paneStyle, SPLIT_DEFAULT_SIZES, splitStyle } from "../stories/layout"
import { SplitPane, SplitView } from "."

const meta = {
    title: "Containers/Split",
    component: SplitView,
    tags: ["autodocs"],
    args: {
        vertical: false,
        defaultSizes: SPLIT_DEFAULT_SIZES,
        proportionalLayout: true,
        separator: true,
        className: undefined,
        onChange: fn(),
        onDragEnd: fn(),
        children: (
            <>
                <SplitPane>
                    <div style={paneStyle}>{SPLIT_LEFT}</div>
                </SplitPane>
                <SplitPane>
                    <div style={paneStyle}>{SPLIT_RIGHT}</div>
                </SplitPane>
            </>
        ),
    },
    decorators: [
        Story => (
            <div style={splitStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SplitView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Vertical: Story = { args: { vertical: true } }
