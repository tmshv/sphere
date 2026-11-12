import type { Meta, StoryObj } from "@storybook/react-vite"
import { space } from "../../tokens"
import { Section } from "./Section"
import { BAR_HEIGHT, labelStyle, rowStyle } from "./styles"

function Spacing() {
    return (
        <Section>
            {Object.entries(space).map(([name, size]) => (
                <div key={name} style={rowStyle}>
                    <code style={labelStyle}>
                        {name} {size}px
                    </code>
                    <div style={{ width: size, height: BAR_HEIGHT, background: "currentColor" }} />
                </div>
            ))}
        </Section>
    )
}

const meta = {
    title: "Foundations/Spacing",
    component: Spacing,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Spacing>

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {}
