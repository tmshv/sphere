import { IconCopy, IconTrash } from "@tabler/icons"
import { page, userEvent } from "vitest/browser"
import type { ReactNode } from "react"
import { visualCases } from "../visual/visualCases"
import { ContextMenu, ContextMenuItem, ContextMenuLabel } from "."

const noop = () => {}
const ICON_SIZE = 14
const MENU_POSITION: [number, number] = [200, 120]
const NEAR_EDGE_POSITION: [number, number] = [780, 580]
const NEAR_EDGE_ALLOWED_MISMATCH = 0.0005

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
    "near-edge": {
        render: () => (
            <ContextMenu opened position={NEAR_EDGE_POSITION} onClose={noop}>
                <Items />
            </ContextMenu>
        ),
        interact: waitForMenu,
        target: "page",
        // The shift near the window edge is fractional (the menu height is fractional). Mantine's
        // floating-ui keeps the fraction; Base UI rounds the popup to a whole pixel, so a few
        // glyphs (the shortcut and the trash icon) anti-alias differently. About 90 of 480000 pixels.
        allowedMismatchedPixelRatio: NEAR_EDGE_ALLOWED_MISMATCH,
    },
})
