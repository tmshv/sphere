import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { CommandPalette } from "../../CommandPalette"
import { COMMANDS, PALETTE_EMPTY_MESSAGE, PALETTE_OPEN_KEYS, PALETTE_PLACEHOLDER, PALETTE_SHORTCUT } from "../fixtures"
import { AppWindow } from "./AppWindow"

function CommandPaletteOverWindow() {
    return (
        <CommandPalette
            commands={COMMANDS}
            shortcut={PALETTE_SHORTCUT}
            placeholder={PALETTE_PLACEHOLDER}
            emptyMessage={PALETTE_EMPTY_MESSAGE}
        >
            <AppWindow />
        </CommandPalette>
    )
}

const meta = {
    title: "Compositions/CommandPaletteOverWindow",
    component: CommandPaletteOverWindow,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CommandPaletteOverWindow>

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
