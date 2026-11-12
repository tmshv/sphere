import type { Meta, StoryObj } from "@storybook/react-vite"
import { ROW_ITEMS } from "../stories/fixtures"
import { boxStyle, rowStackStyle, tallBoxStyle } from "../stories/layout"
import type { Align, Gap } from "."
import { type Justify, Row } from "./Row"

const GAPS: ReadonlyArray<Gap> = ["xxs", "xs", "sm", "md"]
const ALIGNS: ReadonlyArray<Align> = ["start", "center", "end", "stretch"]
const JUSTIFIES: ReadonlyArray<Justify> = ["start", "end", "between"]

const meta = {
    title: "Layout/Row",
    component: Row,
    tags: ["autodocs"],
    args: {
        gap: "sm",
        align: "center",
        justify: "start",
        grow: false,
        className: undefined,
        style: rowStackStyle,
        children: ROW_ITEMS.map((item, index) => (
            <div key={item} style={index === 1 ? tallBoxStyle : boxStyle}>
                {item}
            </div>
        )),
    },
    argTypes: {
        gap: { control: "radio", options: GAPS },
        align: { control: "radio", options: ALIGNS },
        justify: { control: "radio", options: JUSTIFIES },
    },
} satisfies Meta<typeof Row>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SpaceBetween: Story = { args: { justify: "between" } }

export const Grow: Story = { args: { grow: true } }
