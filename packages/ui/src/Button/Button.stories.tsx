import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { BUTTON_LABEL } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { Button, type ButtonVariant } from "./Button"

const VARIANTS: ReadonlyArray<ButtonVariant> = ["primary", "secondary"]
const DISABLED_STATES: ReadonlyArray<boolean> = [false, true]

const meta = {
    title: "Controls/Button",
    component: Button,
    tags: ["autodocs"],
    args: { children: BUTTON_LABEL, variant: "primary", type: "button", disabled: false, onClick: fn() },
    argTypes: {
        variant: { control: "radio", options: VARIANTS },
        type: { control: "radio", options: ["button", "submit"] },
    },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = { args: { variant: "secondary" } }

export const Disabled: Story = { args: { disabled: true } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {VARIANTS.flatMap(variant =>
                DISABLED_STATES.map(disabled => (
                    <Button key={`${variant}-${disabled}`} {...args} variant={variant} disabled={disabled}>
                        {`${variant}${disabled ? " disabled" : ""}`}
                    </Button>
                )),
            )}
        </div>
    ),
}
