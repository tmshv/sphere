import type { Meta, StoryObj } from "@storybook/react-vite"
import { shadow } from "../../tokens"
import { Section } from "./Section"
import { PAGE_PADDING, SHADOW_BOX_SIZE, SHADOW_GRID_GAP, SHADOW_LABEL_GAP } from "./styles"

function Shadows() {
    return (
        <Section>
            <div style={{ display: "flex", flexWrap: "wrap", gap: SHADOW_GRID_GAP, padding: PAGE_PADDING }}>
                {Object.entries(shadow).map(([name, value]) => (
                    <div key={name} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: SHADOW_BOX_SIZE,
                                height: SHADOW_BOX_SIZE,
                                boxShadow: value,
                                background: "Canvas",
                                marginBottom: SHADOW_LABEL_GAP,
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
