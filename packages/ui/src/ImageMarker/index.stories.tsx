import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PHOTO_URL } from "../stories/fixtures"
import { galleryStyle, IMAGE_MARKER_SIZE } from "../stories/layout"
import { ImageMarker, type ImageMarkerLayout } from "."

const LAYOUTS: ReadonlyArray<ImageMarkerLayout> = ["circle", "square"]

const meta = {
    title: "Data/ImageMarker",
    component: ImageMarker,
    tags: ["autodocs"],
    args: {
        src: PHOTO_URL,
        size: IMAGE_MARKER_SIZE,
        layout: "circle",
        style: undefined,
        children: undefined,
        onHover: fn(),
        onLeaveHover: fn(),
    },
    argTypes: { layout: { control: "radio", options: LAYOUTS } },
} satisfies Meta<typeof ImageMarker>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Square: Story = { args: { layout: "square" } }

export const Gallery: Story = {
    render: args => (
        <div style={galleryStyle}>
            {LAYOUTS.map(layout => (
                <ImageMarker key={layout} {...args} layout={layout} />
            ))}
        </div>
    ),
}
