import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { LAYER_COLOR } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { VisibilityToggle, type VisibilityToggleProps } from "."

function VisibilityToggleDemo({ visible: initial, onChange, ...rest }: VisibilityToggleProps) {
    const [visible, setVisible] = useState(initial)

    return (
        <VisibilityToggle
            {...rest}
            visible={visible}
            onChange={next => {
                setVisible(next)
                onChange(next)
            }}
        />
    )
}

const meta = {
    title: "Controls/VisibilityToggle",
    component: VisibilityToggle,
    tags: ["autodocs"],
    args: { visible: true, color: undefined, onChange: fn() },
    argTypes: { color: { control: "color" } },
    render: args => <VisibilityToggleDemo {...args} />,
} satisfies Meta<typeof VisibilityToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Hidden: Story = { args: { visible: false } }

export const Colored: Story = { args: { color: LAYER_COLOR } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            <VisibilityToggleDemo {...args} visible />
            <VisibilityToggleDemo {...args} visible color={LAYER_COLOR} />
            <VisibilityToggleDemo {...args} visible={false} />
        </div>
    ),
}
