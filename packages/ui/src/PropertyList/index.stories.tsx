import type { Meta, StoryObj } from "@storybook/react-vite"
import { FEATURE_PROPERTIES, FEATURE_PROPERTIES_WITH_PHOTO, SOURCE_DETAILS } from "../stories/fixtures"
import { propertyListStyle } from "../stories/layout"
import { PropertyList } from "."

const meta = {
    title: "Data/PropertyList",
    component: PropertyList,
    tags: ["autodocs"],
    args: { items: [...FEATURE_PROPERTIES], copyable: true, checkUrls: false },
    decorators: [
        Story => (
            <div style={propertyListStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PropertyList>

export default meta

type Story = StoryObj<typeof meta>

/** Feature properties, as the properties panel over the map shows them. Right-click a row for the copy menu. */
export const Default: Story = {}

/** Source details, as the source panel shows them. */
export const SourceDetails: Story = { args: { items: [...SOURCE_DETAILS] } }

export const WithImage: Story = { args: { items: [...FEATURE_PROPERTIES_WITH_PHOTO], checkUrls: true } }

/** Statistics that are not worth copying: no glyphs, no menu. */
export const NotCopyable: Story = { args: { items: [...SOURCE_DETAILS], copyable: false } }
