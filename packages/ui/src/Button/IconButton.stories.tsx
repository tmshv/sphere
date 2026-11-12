import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DEFAULT_GLYPH, ICON_GLYPHS } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { IconButton, type IconButtonSize, type IconButtonVariant } from "./IconButton"

const SIZES: ReadonlyArray<IconButtonSize> = ["sm", "md"]
const VARIANTS: ReadonlyArray<IconButtonVariant> = ["glyph", "bordered"]
type GalleryState = { name: string; active: boolean; disabled: boolean }
const STATES: ReadonlyArray<GalleryState> = [
    { name: "rest", active: false, disabled: false },
    { name: "active", active: true, disabled: false },
    { name: "disabled", active: false, disabled: true },
    { name: "active disabled", active: true, disabled: true },
]

const meta = {
    title: "Controls/IconButton",
    component: IconButton,
    tags: ["autodocs"],
    args: {
        icon: ICON_GLYPHS[DEFAULT_GLYPH],
        label: "Add source",
        onClick: fn(),
        size: "md",
        variant: "glyph",
        nativeTooltip: true,
        active: false,
        disabled: false,
    },
    argTypes: {
        icon: { control: "select", options: Object.keys(ICON_GLYPHS), mapping: ICON_GLYPHS },
        size: { control: "radio", options: SIZES },
        variant: { control: "radio", options: VARIANTS },
    },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { active: true } }

export const Bordered: Story = { args: { variant: "bordered" } }

export const BorderedActive: Story = { args: { variant: "bordered", active: true } }

export const DisabledActive: Story = { args: { disabled: true, active: true } }

export const Disabled: Story = { args: { disabled: true } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {VARIANTS.flatMap(variant =>
                SIZES.flatMap(size =>
                    STATES.map(state => (
                        <IconButton
                            key={`${variant}-${size}-${state.name}`}
                            {...args}
                            size={size}
                            variant={variant}
                            active={state.active}
                            disabled={state.disabled}
                            label={`${variant} ${size} ${state.name}`}
                        />
                    )),
                ),
            )}
        </div>
    ),
}
