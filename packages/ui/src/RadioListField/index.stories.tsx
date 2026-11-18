import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { RADIO_LIST_LABEL, RADIO_LIST_OPTIONS } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { RadioListField, type RadioListFieldProps } from "."

function RadioListFieldDemo({ value: initial, onChange, ...rest }: RadioListFieldProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={fieldStyle}>
            <RadioListField
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
    title: "Controls/RadioListField",
    component: RadioListField,
    tags: ["autodocs"],
    args: {
        label: RADIO_LIST_LABEL,
        value: RADIO_LIST_OPTIONS.at(0)?.value,
        options: [...RADIO_LIST_OPTIONS],
        onChange: fn(),
    },
    render: args => <RadioListFieldDemo {...args} />,
} satisfies Meta<typeof RadioListField>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoneSelected: Story = { args: { value: undefined } }
