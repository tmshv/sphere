import type { Meta, StoryObj } from "@storybook/react-vite"
import { opacity } from "../../tokens"
import { Section } from "./Section"
import { labelStyle, rowStyle, SAMPLE_BOX_SIZE } from "./styles"

function Opacity() {
    return (
        <Section>
            {Object.entries(opacity).map(([name, value]) => (
                <div key={name} style={rowStyle}>
                    <code style={labelStyle}>
                        {name} {value}
                    </code>
                    <div style={{ width: SAMPLE_BOX_SIZE, height: SAMPLE_BOX_SIZE, background: "currentColor" }} />
                    <div
                        style={{
                            width: SAMPLE_BOX_SIZE,
                            height: SAMPLE_BOX_SIZE,
                            background: "currentColor",
                            opacity: value,
                        }}
                    />
                </div>
            ))}
        </Section>
    )
}

const meta = {
    title: "Foundations/Opacity",
    component: Opacity,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Opacity>

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {}
