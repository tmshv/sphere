import { IconCopy, IconTrash } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import type { ReactNode } from "react"
import { visualCases } from "../visual/visualCases"
import { ContextMenu, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "."

const noop = () => {}
const ICON_SIZE = 14
const MENU_POSITION: [number, number] = [200, 120]
const NEAR_EDGE_POSITION: [number, number] = [780, 580]
const NEAR_EDGE_ALLOWED_MISMATCH = 0.0005
const LONG_LABEL =
    "Zoom to municipal cadastral parcels with ownership attributes and zoning overlay, revision 2024-11-12"
const LONG_SHORTCUT = "Ctrl+Shift+Alt+Option+Command+K"

function Items(): ReactNode {
    return (
        <>
            <ContextMenuLabel>Layer</ContextMenuLabel>
            <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} shortcut="Cmd+C">
                Copy
            </ContextMenuItem>
            <ContextMenuItem icon={<IconTrash size={ICON_SIZE} />} disabled shortcut="Del">
                Delete
            </ContextMenuItem>
            <ContextMenuItem>Rename</ContextMenuItem>
        </>
    )
}

function SeparatedItems(): ReactNode {
    return (
        <>
            <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} shortcut="Cmd+C">
                Copy
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Rename</ContextMenuItem>
        </>
    )
}

async function waitForMenu() {
    await expect.element(page.getByRole("menuitem", { name: "Rename" })).toBeVisible()
}

visualCases("ContextMenu", {
    open: {
        render: () => (
            <ContextMenu opened position={MENU_POSITION} onClose={noop}>
                <Items />
            </ContextMenu>
        ),
        interact: waitForMenu,
        target: "page",
    },
    "item-hover": {
        render: () => (
            <ContextMenu opened position={MENU_POSITION} onClose={noop}>
                <Items />
            </ContextMenu>
        ),
        interact: async () => {
            await waitForMenu()
            await userEvent.hover(page.getByRole("menuitem", { name: "Copy" }))
        },
        target: "page",
    },
    // The highlight follows the pointer and the keyboard alike. Base UI ignores the synthetic pointer moves WebKit
    // gets from Playwright (they carry no movement), so the highlight is pinned by focusing the item, as the arrow
    // keys do; item-hover above pins that the pointer passing over an item adds no hover style of its own.
    "item-highlighted": {
        render: () => (
            <ContextMenu opened position={MENU_POSITION} onClose={noop}>
                <Items />
            </ContextMenu>
        ),
        interact: async () => {
            await waitForMenu()
            const copy = page.getByRole("menuitem", { name: "Copy" })
            copy.element().focus()
            await expect.element(copy).toHaveAttribute("data-highlighted")
        },
        target: "page",
    },
    "near-edge": {
        render: () => (
            <ContextMenu opened position={NEAR_EDGE_POSITION} onClose={noop}>
                <Items />
            </ContextMenu>
        ),
        interact: waitForMenu,
        target: "page",
        // The shift near the window edge is fractional (the menu height is fractional); Base UI rounds the popup
        // to a whole pixel, so a few glyphs (the shortcut and the trash icon) anti-alias differently.
        allowedMismatchedPixelRatio: NEAR_EDGE_ALLOWED_MISMATCH,
    },
    "long-label": {
        render: () => (
            <ContextMenu opened position={MENU_POSITION} onClose={noop}>
                <ContextMenuLabel>Layer</ContextMenuLabel>
                <ContextMenuItem icon={<IconCopy size={ICON_SIZE} />} shortcut={LONG_SHORTCUT}>
                    {LONG_LABEL}
                </ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
            </ContextMenu>
        ),
        interact: waitForMenu,
        target: "page",
    },
    separator: {
        render: () => (
            <ContextMenu opened position={MENU_POSITION} onClose={noop}>
                <SeparatedItems />
            </ContextMenu>
        ),
        interact: waitForMenu,
        target: "page",
    },
})
