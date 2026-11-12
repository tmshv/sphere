import type { Meta, StoryObj } from "@storybook/react-vite"
import { controlHeight, menuItemHeight, rowHeight } from "../../tokens"
import { Section } from "./Section"
import { HEIGHT_SAMPLE_WIDTH, labelStyle, OUTLINE, rowStyle } from "./styles"

type HeightsProps = {
    title: string
    entries: [string, number][]
}

function Heights({ title, entries }: HeightsProps) {
    return (
        <>
            <h3>{title}</h3>
            {entries.map(([name, height]) => (
                <div key={name} style={rowStyle}>
                    <code style={labelStyle}>
                        {name} {height}px
                    </code>
                    <div style={{ width: HEIGHT_SAMPLE_WIDTH, height, border: OUTLINE, boxSizing: "border-box" }} />
                </div>
            ))}
        </>
    )
}

function Sizes() {
    return (
        <Section>
            <Heights title="Control height" entries={Object.entries(controlHeight)} />
            <Heights
                title="Rows"
                entries={[
                    ["row", rowHeight],
                    ["menu item", menuItemHeight],
                ]}
            />
        </Section>
    )
}

const meta = {
    title: "Foundations/Sizes",
    component: Sizes,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Sizes>

export default meta

type Story = StoryObj<typeof meta>

export const Scale: Story = {}
