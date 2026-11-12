import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { COMMANDS, PALETTE_EMPTY_MESSAGE, PALETTE_PLACEHOLDER, PALETTE_SHORTCUT } from "../stories/fixtures"
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
        children: <div style={overlayStyle}>Press Ctrl+K to open the palette</div>,
    },
} satisfies Meta<typeof CommandPalette>

export default meta

type Story = StoryObj<typeof meta>

export const Opened: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.keyboard("{Control>}k{/Control}")
        const body = within(canvasElement.ownerDocument.body)
        await expect(await body.findByPlaceholderText(PALETTE_PLACEHOLDER)).toBeVisible()
    },
}

export const NothingFound: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.keyboard("{Control>}k{/Control}")
        const body = within(canvasElement.ownerDocument.body)
        await userEvent.type(await body.findByPlaceholderText(PALETTE_PLACEHOLDER), "zzzz")
        await expect(await body.findByText(PALETTE_EMPTY_MESSAGE)).toBeVisible()
    },
}
