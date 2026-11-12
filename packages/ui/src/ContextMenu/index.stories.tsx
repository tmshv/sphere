import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CONTEXT_MENU_ITEMS, ICON_GLYPHS, LONG_MENU_ITEM, LONG_SHORTCUT, MENU_LABEL } from "../stories/fixtures"
import { CONTEXT_MENU_POSITION, overlayStyle } from "../stories/layout"
import { ContextMenu, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "."

const { zoom, edit, remove, rename } = CONTEXT_MENU_ITEMS

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
                <ContextMenuItem icon={zoom.icon} shortcut={zoom.shortcut} onClick={fn()}>
                    {zoom.label}
                </ContextMenuItem>
                <ContextMenuItem icon={edit.icon} shortcut={edit.shortcut} onClick={fn()}>
                    {edit.label}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem icon={remove.icon} disabled>
                    {remove.label}
                </ContextMenuItem>
                <ContextMenuItem onClick={fn()}>{rename.label}</ContextMenuItem>
            </>
        ),
    },
}

export const WithSeparator: Story = {
    args: {
        children: (
            <>
                <ContextMenuItem onClick={fn()}>{zoom.label}</ContextMenuItem>
                <ContextMenuItem onClick={fn()}>{edit.label}</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={fn()}>{rename.label}</ContextMenuItem>
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
                <ContextMenuSeparator />
                <ContextMenuItem onClick={fn()}>{rename.label}</ContextMenuItem>
            </>
        ),
    },
}
