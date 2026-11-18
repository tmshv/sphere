import type { Meta, StoryObj } from "@storybook/react-vite"
import { STATUSBAR_BADGE_TEXT, STATUSBAR_BADGE_TITLE, STATUSBAR_ERROR_TEXT } from "../stories/fixtures"
import { Statusbar, StatusbarBadge, type StatusbarBadgeTone, type StatusbarBadgeWidth } from "."

const WIDTHS: ReadonlyArray<StatusbarBadgeWidth> = ["auto", "short", "long"]
const TONES: ReadonlyArray<StatusbarBadgeTone> = ["default", "error"]

const meta = {
    title: "Statusbar/StatusbarBadge",
    component: StatusbarBadge,
    tags: ["autodocs"],
    args: { children: STATUSBAR_BADGE_TEXT, title: STATUSBAR_BADGE_TITLE, width: "auto", tone: "default" },
    argTypes: {
        width: { control: "radio", options: WIDTHS },
        tone: { control: "radio", options: TONES },
    },
    decorators: [
        Story => (
            <Statusbar>
                <Story />
            </Statusbar>
        ),
    ],
} satisfies Meta<typeof StatusbarBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ErrorTone: Story = { args: { tone: "error", children: STATUSBAR_ERROR_TEXT } }

export const Short: Story = { args: { width: "short" } }

export const Long: Story = { args: { width: "long" } }
