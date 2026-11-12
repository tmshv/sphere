import { IconMap } from "@sphere/icons"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import {
    STATUSBAR_BADGE_TEXT,
    STATUSBAR_BADGE_TITLE,
    STATUSBAR_BUTTON_LABEL,
    STATUSBAR_ERROR_TEXT,
    STATUSBAR_SELECT_OPTIONS,
} from "../stories/fixtures"
import { STATUSBAR_ICON_SIZE } from "../stories/layout"
import { Statusbar, StatusbarBadge, StatusbarButton, StatusbarSelect } from "."

const meta = {
    title: "Statusbar/Statusbar",
    component: Statusbar,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        children: (
            <>
                <StatusbarButton
                    icon={<IconMap size={STATUSBAR_ICON_SIZE} />}
                    label={STATUSBAR_BUTTON_LABEL}
                    onClick={fn()}
                />
                <StatusbarBadge title={STATUSBAR_BADGE_TITLE}>{STATUSBAR_BADGE_TEXT}</StatusbarBadge>
                <StatusbarBadge tone="error">{STATUSBAR_ERROR_TEXT}</StatusbarBadge>
                <StatusbarSelect
                    value={STATUSBAR_SELECT_OPTIONS.at(0)?.value ?? ""}
                    options={[...STATUSBAR_SELECT_OPTIONS]}
                    onChange={fn()}
                />
            </>
        ),
    },
} satisfies Meta<typeof Statusbar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
