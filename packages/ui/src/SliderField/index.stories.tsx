import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { SLIDER_LABEL, SLIDER_MAX, SLIDER_MIN, SLIDER_STEP, SLIDER_VALUE } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { SliderField, type SliderFieldProps } from "."

function SliderFieldDemo({ value: initial, onChange, ...rest }: SliderFieldProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={fieldStyle}>
            <SliderField
                {...rest}
                value={value}
                onChange={next => {
                    setValue(next)
                    onChange(next)
                }}
            />
        </div>
    )
}

const meta = {
    title: "Controls/SliderField",
    component: SliderField,
    tags: ["autodocs"],
    args: {
        label: SLIDER_LABEL,
        value: SLIDER_VALUE,
        min: SLIDER_MIN,
        max: SLIDER_MAX,
        step: SLIDER_STEP,
        onChange: fn(),
    },
    render: args => <SliderFieldDemo {...args} />,
} satisfies Meta<typeof SliderField>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AtMinimum: Story = { args: { value: SLIDER_MIN } }

export const AtMaximum: Story = { args: { value: SLIDER_MAX } }
