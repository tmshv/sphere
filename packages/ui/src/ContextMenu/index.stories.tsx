import { IconPencil, IconTrash, IconZoomReset } from "@sphere/icons"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ICON_GLYPHS, LONG_MENU_ITEM, LONG_SHORTCUT, MENU_LABEL } from "../stories/fixtures"
import { CONTEXT_MENU_POSITION, ICON_SIZE, overlayStyle } from "../stories/layout"
import { ContextMenu, ContextMenuItem, ContextMenuLabel } from "."

const meta = {
    title: "Menus/ContextMenu",
    component: ContextMenu,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        opened: true,
        position: CONTEXT_MENU_POSITION,
        onClose: fn(),
        children: null,
    },
    decorators: [
        Story => (
            <div style={overlayStyle}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ContextMenu>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        children: (
            <>
                <ContextMenuLabel>{MENU_LABEL}</ContextMenuLabel>
                <ContextMenuItem icon={<IconZoomReset size={ICON_SIZE} />} shortcut="Z" onClick={fn()}>
                    Zoom to source
                </ContextMenuItem>
                <ContextMenuItem icon={<IconPencil size={ICON_SIZE} />} shortcut="E" onClick={fn()}>
                    Edit features
                </ContextMenuItem>
                <ContextMenuItem icon={<IconTrash size={ICON_SIZE} />} disabled>
                    Remove source
                </ContextMenuItem>
                <ContextMenuItem onClick={fn()}>Rename</ContextMenuItem>
            </>
        ),
    },
}

export const LongLabel: Story = {
    args: {
        children: (
            <>
                <ContextMenuLabel>{MENU_LABEL}</ContextMenuLabel>
                <ContextMenuItem icon={ICON_GLYPHS.ZoomReset} shortcut={LONG_SHORTCUT} onClick={fn()}>
                    {LONG_MENU_ITEM}
                </ContextMenuItem>
                <ContextMenuItem onClick={fn()}>Rename</ContextMenuItem>
            </>
        ),
    },
}
