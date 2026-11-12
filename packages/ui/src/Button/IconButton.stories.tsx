import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DEFAULT_GLYPH, ICON_GLYPHS } from "../stories/fixtures"
import { galleryStyle } from "../stories/layout"
import { IconButton, type IconButtonAppearance, type IconButtonSize } from "./IconButton"

const SIZES: ReadonlyArray<IconButtonSize> = ["sm", "md"]
const APPEARANCES: ReadonlyArray<IconButtonAppearance> = ["subtle", "solid"]
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
        appearance: "subtle",
        active: false,
        disabled: false,
    },
    argTypes: {
        icon: { control: "select", options: Object.keys(ICON_GLYPHS), mapping: ICON_GLYPHS },
        size: { control: "radio", options: SIZES },
        appearance: { control: "radio", options: APPEARANCES },
    },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { active: true, appearance: "solid" } }

export const Disabled: Story = { args: { disabled: true } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {SIZES.flatMap(size =>
                APPEARANCES.flatMap(appearance =>
                    STATES.map(state => (
                        <IconButton
                            key={`${size}-${appearance}-${state.name}`}
                            {...args}
                            size={size}
                            appearance={appearance}
                            active={state.active}
                            disabled={state.disabled}
                            label={`${size} ${appearance} ${state.name}`}
                        />
                    )),
                ),
            )}
        </div>
    ),
}
