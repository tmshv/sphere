import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { ICON_SEGMENT_OPTIONS, SEGMENT_LABEL, SEGMENT_OPTIONS, SEGMENT_VALUE } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { StateSheet } from "../stories/StateSheet"
import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl"

const SIZES: ReadonlyArray<SegmentedControlProps["size"]> = ["sm", "md"]
const CHECKED_SEGMENT = '[role="radio"][data-checked]'
const UNCHECKED_SEGMENT = '[role="radio"]:not([data-checked])'
const KINDS = [
    { name: "text", options: SEGMENT_OPTIONS },
    { name: "icon", options: ICON_SEGMENT_OPTIONS },
]

function SegmentedControlDemo({ value: initial, onChange, ...rest }: SegmentedControlProps) {
    const [value, setValue] = useState(initial)

    return (
        <SegmentedControl
            {...rest}
            value={value}
            onChange={next => {
                setValue(next)
                onChange(next)
            }}
        />
    )
}

const meta = {
    title: "Controls/SegmentedControl",
    component: SegmentedControl,
    tags: ["autodocs"],
    args: { label: SEGMENT_LABEL, options: SEGMENT_OPTIONS, value: SEGMENT_VALUE, size: "md", onChange: fn() },
    argTypes: { size: { control: "radio", options: SIZES } },
    render: args => <SegmentedControlDemo {...args} />,
} satisfies Meta<typeof SegmentedControl>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: "sm" } }

export const IconOnly: Story = { args: { options: ICON_SEGMENT_OPTIONS } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {KINDS.flatMap(kind =>
                SIZES.map(size => (
                    <SegmentedControlDemo
                        key={`${kind.name}-${size}`}
                        {...args}
                        label={`${kind.name} ${size}`}
                        options={kind.options}
                        size={size}
                    />
                )),
            )}
        </div>
    ),
}

// Rest, keyboard focus and press side by side. Focus lands on the checked segment (arrow keys move the check with
// it); a press darkens an unchecked one.
export const States: Story = {
    render: args => (
        <StateSheet
            target={UNCHECKED_SEGMENT}
            focusTarget={CHECKED_SEGMENT}
            render={() => <SegmentedControl {...args} />}
        />
    ),
}
