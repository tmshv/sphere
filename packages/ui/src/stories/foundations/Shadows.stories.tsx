import type { Meta, StoryObj } from "@storybook/react-vite"
import { shadow } from "../../tokens"
import { Section } from "./Swatch"

const BOX_SIZE = 96

function Shadows() {
    return (
        <Section>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, padding: 16 }}>
                {Object.entries(shadow).map(([name, value]) => (
                    <div key={name} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: BOX_SIZE,
                                height: BOX_SIZE,
                                boxShadow: value,
                                background: "Canvas",
                                marginBottom: 8,
                            }}
                        />
                        <code>{name}</code>
                    </div>
                ))}
            </div>
        </Section>
    )
}

const meta = {
    title: "Foundations/Shadows",
    component: Shadows,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Shadows>

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {}
