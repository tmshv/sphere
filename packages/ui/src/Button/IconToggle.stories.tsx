import { IconBulb, IconBulbOff, IconMountain, IconMountainOff } from "@sphere/icons"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { BULB_HIDE_LABEL, BULB_SHOW_LABEL, LAYER_COLOR } from "../stories/fixtures"
import { ICON_SIZE, galleryStyle } from "../stories/layout"
import { IconToggle, type IconToggleProps } from "./IconToggle"
import type { IconButtonSize } from "./IconButton"

const SIZES: ReadonlyArray<IconButtonSize> = ["sm", "md"]

function IconToggleDemo({ value: initial, onChange, ...rest }: IconToggleProps) {
    const [value, setValue] = useState(initial)

    return (
        <IconToggle
            {...rest}
            value={value}
            onChange={next => {
                setValue(next)
                onChange(next)
            }}
        />
    )
}

const meta = {
    title: "Controls/IconToggle",
    component: IconToggle,
    tags: ["autodocs"],
    args: {
        value: true,
        on: { icon: <IconBulb size={ICON_SIZE} />, label: BULB_HIDE_LABEL },
        off: { icon: <IconBulbOff size={ICON_SIZE} />, label: BULB_SHOW_LABEL },
        onChange: fn(),
        disabled: false,
        size: "md",
    },
    argTypes: {
        size: { control: "radio", options: SIZES },
    },
    render: args => <IconToggleDemo {...args} />,
} satisfies Meta<typeof IconToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Off: Story = { args: { value: false } }

export const Coloured: Story = {
    args: { on: { icon: <IconBulb size={ICON_SIZE} color={LAYER_COLOR} />, label: BULB_HIDE_LABEL } },
}

export const Terrain: Story = {
    args: {
        on: { icon: <IconMountain size={ICON_SIZE} />, label: "Hide terrain" },
        off: { icon: <IconMountainOff size={ICON_SIZE} />, label: "Show terrain" },
    },
}

/** On, off, coloured and disabled side by side. */
export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            <IconToggle {...args} value />
            <IconToggle {...args} value={false} />
            <IconToggle
                {...args}
                value
                on={{ icon: <IconBulb size={ICON_SIZE} color={LAYER_COLOR} />, label: BULB_HIDE_LABEL }}
            />
            <IconToggle {...args} value disabled />
        </div>
    ),
}
