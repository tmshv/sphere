import type { Meta, StoryObj } from "@storybook/react-vite"
import { ROW_ITEMS, ROW_TALL_ITEM_INDEX } from "../stories/fixtures"
import { boxStyle, rowStackStyle, tallBoxStyle } from "../stories/layout"
import type { Align, Gap } from "."
import { Stack } from "./Stack"

const GAPS: ReadonlyArray<Gap> = ["xxs", "xs", "sm", "md"]
const ALIGNS: ReadonlyArray<Align> = ["start", "center", "end", "stretch"]

const meta = {
    title: "Containers/Layout/Stack",
    component: Stack,
    tags: ["autodocs"],
    args: {
        gap: "sm",
        align: "start",
        className: undefined,
        style: rowStackStyle,
        children: ROW_ITEMS.map((item, index) => (
            <div key={item} style={index === ROW_TALL_ITEM_INDEX ? tallBoxStyle : boxStyle}>
                {item}
            </div>
        )),
    },
    argTypes: {
        gap: { control: "radio", options: GAPS },
        align: { control: "radio", options: ALIGNS },
    },
} satisfies Meta<typeof Stack>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Centered: Story = { args: { align: "center" } }
