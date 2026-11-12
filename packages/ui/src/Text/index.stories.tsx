import type { Meta, StoryObj } from "@storybook/react-vite"
import { SOURCE_NAMES } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { Heading, Text, type TextTone, type TextWeight } from "."

const TONES: ReadonlyArray<TextTone> = ["default", "dimmed", "warning"]
const WEIGHTS: ReadonlyArray<TextWeight> = ["normal", "medium", "semibold"]
const SAMPLE = SOURCE_NAMES.at(0) ?? ""

const meta = {
    title: "Data/Text",
    component: Text,
    tags: ["autodocs"],
    args: { tone: "default", weight: "normal", uppercase: false, style: undefined, children: SAMPLE },
    argTypes: {
        tone: { control: "radio", options: TONES },
        weight: { control: "radio", options: WEIGHTS },
    },
} satisfies Meta<typeof Text>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Uppercase: Story = { args: { uppercase: true } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {TONES.flatMap(tone =>
                WEIGHTS.map(weight => (
                    <Text key={`${tone}-${weight}`} {...args} tone={tone} weight={weight}>
                        {`${tone} ${weight}`}
                    </Text>
                )),
            )}
        </div>
    ),
}

export const HeadingStory: StoryObj<typeof Heading> = {
    name: "Heading",
    render: () => <Heading>{SAMPLE}</Heading>,
}
