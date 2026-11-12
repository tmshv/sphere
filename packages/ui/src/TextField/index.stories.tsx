import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn, within } from "storybook/test"
import {
    LONG_FIELD_VALUE,
    TEXT_FIELD_ERROR,
    TEXT_FIELD_LABEL,
    TEXT_FIELD_PLACEHOLDER,
    TEXT_FIELD_VALUE,
} from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { TextField, type TextFieldProps } from "."

function TextFieldDemo({ value: initial, onChange, ...rest }: TextFieldProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={fieldStyle}>
            <TextField
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
    title: "Controls/TextField",
    component: TextField,
    tags: ["autodocs"],
    args: {
        label: TEXT_FIELD_LABEL,
        value: "",
        placeholder: undefined,
        error: undefined,
        rightSection: undefined,
        required: false,
        code: false,
        onChange: fn(),
        onBlur: fn(),
    },
    render: args => <TextFieldDemo {...args} />,
} satisfies Meta<typeof TextField>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Placeholder: Story = { args: { placeholder: TEXT_FIELD_PLACEHOLDER } }

export const WithValue: Story = { args: { value: TEXT_FIELD_VALUE } }

export const WithError: Story = { args: { value: TEXT_FIELD_VALUE, error: TEXT_FIELD_ERROR } }

export const Required: Story = { args: { required: true } }

export const LongValue: Story = { args: { value: LONG_FIELD_VALUE } }

export const WithRightSection: Story = { args: { value: TEXT_FIELD_VALUE, rightSection: <span aria-hidden>Aa</span> } }

export const Focused: Story = {
    args: { value: TEXT_FIELD_VALUE },
    play: async ({ canvasElement }) => {
        await within(canvasElement).getByLabelText(TEXT_FIELD_LABEL).focus()
    },
}
