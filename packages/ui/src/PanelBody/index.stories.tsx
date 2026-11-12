import type { Meta, StoryObj } from "@storybook/react-vite"
import { PANEL_HEADER, PANEL_LINES } from "../stories/fixtures"
import { panelFrameStyle } from "../stories/layout"
import { PanelBody } from "."

const lines = PANEL_LINES.map(line => <div key={line}>{line}</div>)

const meta = {
    title: "Containers/PanelBody",
    component: PanelBody,
    tags: ["autodocs"],
    args: { header: PANEL_HEADER, children: lines },
    decorators: [
        Story => (
            <div style={panelFrameStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PanelBody>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutHeader: Story = { args: { header: undefined } }
