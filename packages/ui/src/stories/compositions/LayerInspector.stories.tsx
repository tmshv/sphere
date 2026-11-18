import type { Meta, StoryObj } from "@storybook/react-vite"
import { inspectorFrameStyle } from "../layout"
import { LayerInspectorPanel } from "./LayerInspectorPanel"

const meta = {
    title: "Compositions/LayerInspector",
    component: LayerInspectorPanel,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    decorators: [
        Story => (
            <div style={inspectorFrameStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof LayerInspectorPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
