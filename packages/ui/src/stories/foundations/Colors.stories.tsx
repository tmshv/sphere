import type { Meta, StoryObj } from "@storybook/react-vite"
import { semantic } from "../../tokens"
import { Section } from "./Section"
import { Swatch } from "./Swatch"

function Colors() {
    return (
        <Section>
            {Object.entries(semantic).map(([name, value]) => (
                <Swatch key={name} name={name} light={value.light} dark={value.dark} />
            ))}
        </Section>
    )
}

const meta = {
    title: "Foundations/Colors",
    component: Colors,
    parameters: { layout: "padded" },
} satisfies Meta<typeof Colors>

export default meta

type Story = StoryObj<typeof meta>

export const Semantic: Story = {}
