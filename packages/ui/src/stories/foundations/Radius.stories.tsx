import type { Meta, StoryObj } from "@storybook/react-vite"
import { radius } from "../../tokens"
import { Section } from "./Section"
import { OUTLINE, SAMPLE_BOX_SIZE, wrapStyle } from "./styles"

function Radius() {
    return (
        <Section>
            <div style={wrapStyle}>
                {Object.entries(radius).map(([name, size]) => (
                    <div key={name} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: SAMPLE_BOX_SIZE,
                                height: SAMPLE_BOX_SIZE,
                                borderRadius: size,
                                border: OUTLINE,
                                boxSizing: "border-box",
                            }}
                        />
                        <code>
                            {name} {size}px
                        </code>
                    </div>
                ))}
            </div>
        </Section>
    )
}

const meta = {
    title: "Foundations/Radius",
    component: Radius,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Radius>

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {}
