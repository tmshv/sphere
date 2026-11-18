import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { SWITCH_LABEL } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { SwitchField, type SwitchFieldProps } from "."

function SwitchFieldDemo({ checked: initial, onChange, ...rest }: SwitchFieldProps) {
    const [checked, setChecked] = useState(initial)

    return (
        <div style={fieldStyle}>
            <SwitchField
                {...rest}
                checked={checked}
                onChange={next => {
                    setChecked(next)
                    onChange(next)
                }}
            />
        </div>
    )
}

const meta = {
    title: "Controls/SwitchField",
    component: SwitchField,
    tags: ["autodocs"],
    args: {
        label: SWITCH_LABEL,
        checked: false,
        onChange: fn(),
    },
    render: args => <SwitchFieldDemo {...args} />,
} satisfies Meta<typeof SwitchField>

export default meta

type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = { args: { checked: true } }
