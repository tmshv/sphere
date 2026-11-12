import type { Meta, StoryObj } from "@storybook/react-vite"
import { radius } from "../../tokens"
import { Section } from "./Swatch"

const BOX_SIZE = 64

function Radius() {
    return (
        <Section>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                {Object.entries(radius).map(([name, size]) => (
                    <div key={name} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: BOX_SIZE,
                                height: BOX_SIZE,
                                borderRadius: size,
                                border: "2px solid currentColor",
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
