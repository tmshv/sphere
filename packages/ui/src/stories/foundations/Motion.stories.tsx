import type { Meta, StoryObj } from "@storybook/react-vite"
import { duration } from "../../tokens"
import { Section } from "./Section"
import { BAR_HEIGHT, labelStyle, MS_PER_PX, rowStyle } from "./styles"

function Motion() {
    return (
        <Section>
            {Object.entries(duration).map(([name, ms]) => (
                <div key={name} style={rowStyle}>
                    <code style={labelStyle}>
                        {name} {ms}ms
                    </code>
                    <div style={{ width: ms / MS_PER_PX, height: BAR_HEIGHT, background: "currentColor" }} />
                </div>
            ))}
        </Section>
    )
}

const meta = {
    title: "Foundations/Motion",
    component: Motion,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Motion>

export default meta

type Story = StoryObj<typeof meta>

export const Durations: Story = {}
