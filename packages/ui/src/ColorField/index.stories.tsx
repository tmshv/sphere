import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { COLOR_LABEL, COLOR_VALUE } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { ColorField, type ColorFieldProps } from "."

function ColorFieldDemo({ value: initial, onChange, ...rest }: ColorFieldProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={fieldStyle}>
            <ColorField
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
    title: "Controls/ColorField",
    component: ColorField,
    tags: ["autodocs"],
    args: { label: COLOR_LABEL, value: COLOR_VALUE, onChange: fn() },
    render: args => <ColorFieldDemo {...args} />,
} satisfies Meta<typeof ColorField>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
