import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { LONG_TAB_ITEMS, TAB_ITEMS } from "../stories/fixtures"
import { tabsFrameStyle } from "../stories/layout"
import { Tabs, type TabsProps } from "."

function TabsDemo({ value: initial, onChange, ...rest }: TabsProps) {
    const [value, setValue] = useState(initial)

    return (
        <div style={tabsFrameStyle}>
            <Tabs
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
    title: "Controls/Tabs",
    component: Tabs,
    tags: ["autodocs"],
    args: { items: TAB_ITEMS, value: TAB_ITEMS.at(0)?.value ?? "", onChange: fn() },
    render: args => <TabsDemo {...args} />,
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongLabel: Story = {
    args: { items: LONG_TAB_ITEMS, value: LONG_TAB_ITEMS.at(0)?.value ?? "" },
}

export const SecondSelected: Story = { args: { value: TAB_ITEMS.at(1)?.value ?? "" } }
