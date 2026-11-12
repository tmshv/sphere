import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import {
    COMMANDS,
    PALETTE_EMPTY_MESSAGE,
    PALETTE_HINT,
    PALETTE_NO_MATCH_QUERY,
    PALETTE_OPEN_KEYS,
    PALETTE_PLACEHOLDER,
    PALETTE_SHORTCUT,
} from "../stories/fixtures"
import { overlayStyle } from "../stories/layout"
import { CommandPalette } from "."

const meta = {
    title: "Menus/CommandPalette",
    component: CommandPalette,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        commands: COMMANDS,
        shortcut: PALETTE_SHORTCUT,
        placeholder: PALETTE_PLACEHOLDER,
        emptyMessage: PALETTE_EMPTY_MESSAGE,
        children: <div style={overlayStyle}>{PALETTE_HINT}</div>,
    },
} satisfies Meta<typeof CommandPalette>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.keyboard(PALETTE_OPEN_KEYS)
        const body = within(canvasElement.ownerDocument.body)
        const input = await body.findByPlaceholderText(PALETTE_PLACEHOLDER)
        await waitFor(() => expect(input).toBeVisible())
    },
}

export const NothingFound: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.keyboard(PALETTE_OPEN_KEYS)
        const body = within(canvasElement.ownerDocument.body)
        await userEvent.type(await body.findByPlaceholderText(PALETTE_PLACEHOLDER), PALETTE_NO_MATCH_QUERY)
        await expect(await body.findByText(PALETTE_EMPTY_MESSAGE)).toBeVisible()
    },
}
