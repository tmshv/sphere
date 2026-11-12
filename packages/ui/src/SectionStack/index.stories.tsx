import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { SECTION_NAMES, SECTION_TITLES, SOURCE_NAMES } from "../stories/fixtures"
import { paneStyle, sectionStackStyle } from "../stories/layout"
import { SectionStack, type SectionLayout, type SectionStackProps } from "."

function initialLayout(open: boolean): SectionLayout[] {
    return SECTION_NAMES.map(name => ({ name, open, size: null }))
}

function SectionStackDemo({ sections: initial, onSectionsChange, children }: SectionStackProps) {
    const [sections, setSections] = useState(initial)

    return (
        <div style={sectionStackStyle}>
            <SectionStack
                sections={sections}
                onSectionsChange={next => {
                    setSections(next)
                    onSectionsChange(next)
                }}
            >
                {children}
            </SectionStack>
        </div>
    )
}

const meta = {
    title: "Containers/SectionStack",
    component: SectionStack,
    tags: ["autodocs"],
    args: {
        sections: initialLayout(true),
        onSectionsChange: fn(),
        children: SECTION_NAMES.map(name => (
            <SectionStack.Section key={name} name={name} title={SECTION_TITLES[name]} minContentSize={40}>
                <div style={paneStyle}>{SOURCE_NAMES.join(", ")}</div>
            </SectionStack.Section>
        )),
    },
    render: args => <SectionStackDemo {...args} />,
} satisfies Meta<typeof SectionStack>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Collapsed: Story = { args: { sections: initialLayout(false) } }
