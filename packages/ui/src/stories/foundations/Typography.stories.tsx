import type { Meta, StoryObj } from "@storybook/react-vite"
import type { CSSProperties } from "react"
import { fontFamily, fontSize, fontWeight, lineHeight } from "../../tokens"
import { Section } from "./Section"
import { baselineRowStyle, labelStyle, SAMPLE_MAX_WIDTH } from "./styles"

const SAMPLE = "The quick brown fox jumps over the lazy dog"

type RampProps = {
    title: string
    entries: [string, string | number][]
    style: (value: string | number) => CSSProperties
    sample?: string
}

function Ramp({ title, entries, style, sample = SAMPLE }: RampProps) {
    return (
        <>
            <h3>{title}</h3>
            {entries.map(([name, value]) => (
                <div key={name} style={baselineRowStyle}>
                    <code style={labelStyle}>
                        {name} {value}
                    </code>
                    <span style={style(value)}>{sample}</span>
                </div>
            ))}
        </>
    )
}

function Typography() {
    return (
        <Section>
            <Ramp title="Size" entries={Object.entries(fontSize)} style={value => ({ fontSize: value })} />
            <Ramp title="Weight" entries={Object.entries(fontWeight)} style={value => ({ fontWeight: value })} />
            <Ramp
                title="Family"
                entries={Object.entries(fontFamily)}
                style={value => ({ fontFamily: String(value) })}
            />
            <Ramp
                title="Line height"
                entries={Object.entries(lineHeight)}
                style={value => ({ lineHeight: value, maxWidth: SAMPLE_MAX_WIDTH })}
                sample={`${SAMPLE}. ${SAMPLE}.`}
            />
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

export const Scale: Story = {}
