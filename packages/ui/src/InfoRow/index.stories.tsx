import type { Meta, StoryObj } from "@storybook/react-vite"
import {
    INFO_ROW_DATA_LABEL,
    INFO_ROW_DATA_VALUE,
    INFO_ROW_LABEL,
    INFO_ROW_VALUE,
    LONG_SOURCE_NAME,
} from "../stories/fixtures"
import { infoRowStyle } from "../stories/layout"
import { InfoRow } from "."

const meta = {
    title: "Data/InfoRow",
    component: InfoRow,
    tags: ["autodocs"],
    args: { label: INFO_ROW_LABEL, value: INFO_ROW_VALUE, labelIsData: false },
    decorators: [
        Story => (
            <div style={infoRowStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof InfoRow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const DataLabel: Story = {
    args: { label: INFO_ROW_DATA_LABEL, value: INFO_ROW_DATA_VALUE, labelIsData: true },
}

export const LongValue: Story = {
    args: { label: INFO_ROW_DATA_LABEL, value: LONG_SOURCE_NAME, labelIsData: true },
}
