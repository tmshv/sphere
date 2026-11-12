import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { SEGMENT_LABEL, SEGMENT_OPTIONS, SEGMENT_VALUE } from "../stories/fixtures"
import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl"

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
    args: { label: SEGMENT_LABEL, options: SEGMENT_OPTIONS, value: SEGMENT_VALUE, onChange: fn() },
    render: args => <SegmentedControlDemo {...args} />,
} satisfies Meta<typeof SegmentedControl>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
