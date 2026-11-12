import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { STATUSBAR_SELECT_OPTIONS } from "../stories/fixtures"
import { Statusbar, StatusbarSelect, type StatusbarSelectProps } from "."

function StatusbarSelectDemo({ value: initial, onChange, ...rest }: StatusbarSelectProps) {
    const [value, setValue] = useState(initial)

    return (
        <Statusbar>
            <StatusbarSelect
                {...rest}
                value={value}
                onChange={next => {
                    setValue(next)
                    onChange(next)
                }}
            />
        </Statusbar>
    )
}

const meta = {
    title: "Statusbar/StatusbarSelect",
    component: StatusbarSelect,
    tags: ["autodocs"],
    args: {
        value: STATUSBAR_SELECT_OPTIONS.at(0)?.value ?? "",
        options: [...STATUSBAR_SELECT_OPTIONS],
        className: undefined,
        onChange: fn(),
    },
    render: args => <StatusbarSelectDemo {...args} />,
} satisfies Meta<typeof StatusbarSelect>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
