import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { LAYER_OPTIONS, SELECT_LABEL, SELECT_PLACEHOLDER } from "../stories/fixtures"
import { fieldStyle } from "../stories/layout"
import { StateSheet } from "../stories/StateSheet"
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

const FIRST_OPTION = LAYER_OPTIONS.at(0)
const TRIGGER = '[role="combobox"]'

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

export const WithValue: Story = { args: { value: FIRST_OPTION?.value ?? null } }

// The list open on the menu surface, with the check on the current value.
export const Open: Story = {
    args: { value: FIRST_OPTION?.value ?? null },
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole("combobox"))
        const body = within(canvasElement.ownerDocument.body)
        const option = await body.findByRole("option", { name: FIRST_OPTION?.label ?? "" })
        await waitFor(() => expect(option).toBeVisible())
    },
}

export const Searchable: Story = { args: { searchable: true } }

// Rest, keyboard focus and press of the pop-up button side by side.
export const States: Story = {
    args: { value: FIRST_OPTION?.value ?? null },
    render: args => (
        <StateSheet
            target={TRIGGER}
            render={() => (
                <div style={fieldStyle}>
                    <Select {...args} />
                </div>
            )}
        />
    ),
}
