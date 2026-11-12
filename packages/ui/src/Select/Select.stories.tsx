import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { LAYER_OPTIONS, SELECT_LABEL, SELECT_PLACEHOLDER } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { Select, type SelectProps } from "./Select"

function SelectDemo({ value: initial, onChange, ...rest }: SelectProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={fieldStyle}>
            <Select
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
    title: "Controls/Select",
    component: Select,
    tags: ["autodocs"],
    args: {
        label: SELECT_LABEL,
        value: null,
        options: LAYER_OPTIONS,
        placeholder: SELECT_PLACEHOLDER,
        searchable: false,
        onChange: fn(),
    },
    render: args => <SelectDemo {...args} />,
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = { args: { value: LAYER_OPTIONS.at(0)?.value ?? null } }

export const Searchable: Story = { args: { searchable: true } }
