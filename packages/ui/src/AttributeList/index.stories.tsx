import type { Meta, StoryObj } from "@storybook/react-vite"
import { ATTRIBUTE_FIELDS } from "../stories/fixtures"
import { attributeListStyle } from "../stories/layout"
import { AttributeList } from "."

const meta = {
    title: "Data/AttributeList",
    component: AttributeList,
    tags: ["autodocs"],
    args: { fields: [...ATTRIBUTE_FIELDS] },
    decorators: [
        Story => (
            <div style={attributeListStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof AttributeList>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { fields: [] } }
