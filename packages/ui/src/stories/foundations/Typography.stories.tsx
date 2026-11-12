import type { Meta, StoryObj } from "@storybook/react-vite"
import { fontFamily, fontSize, fontWeight, lineHeight } from "../../tokens"
import { Section } from "./Swatch"

const SAMPLE = "The quick brown fox jumps over the lazy dog"

function Typography() {
    return (
        <Section>
            <h3>Size</h3>
            {Object.entries(fontSize).map(([name, size]) => (
                <div key={name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <code style={{ width: 80 }}>
                        {name} {size}
                    </code>
                    <span style={{ fontSize: size }}>{SAMPLE}</span>
                </div>
            ))}
            <h3>Weight</h3>
            {Object.entries(fontWeight).map(([name, weight]) => (
                <div key={name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <code style={{ width: 80 }}>
                        {name} {weight}
                    </code>
                    <span style={{ fontWeight: weight }}>{SAMPLE}</span>
                </div>
            ))}
            <h3>Family</h3>
            {Object.entries(fontFamily).map(([name, family]) => (
                <div key={name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <code style={{ width: 80 }}>{name}</code>
                    <span style={{ fontFamily: family }}>{SAMPLE}</span>
                </div>
            ))}
            <h3>Line height</h3>
            {Object.entries(lineHeight).map(([name, height]) => (
                <div key={name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <code style={{ width: 80 }}>
                        {name} {height}
                    </code>
                    <span style={{ lineHeight: height, maxWidth: 320 }}>
                        {SAMPLE}. {SAMPLE}.
                    </span>
                </div>
            ))}
        </Section>
    )
}

const meta = {
    title: "Foundations/Typography",
    component: Typography,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Typography>

export default meta

type Story = StoryObj<typeof meta>

export const Ramp: Story = {}
