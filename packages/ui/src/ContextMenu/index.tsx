import { Menu } from "@base-ui/react/menu"
import { type ReactNode, useMemo } from "react"
import { cx, menu } from "../internal"
import s from "./context-menu.module.css"

// The menu opens with its top-left corner at the pointer.
const MENU_OFFSET_PX = 0
// It flips and shifts at the window edges, keeping this margin from them.
const COLLISION_PADDING_PX = 4
// Flip to the other side, then shift along the edge instead of flipping the alignment.
const COLLISION_AVOIDANCE = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const

export type ContextMenuProps = {
    opened: boolean
    position: [number, number]
    onClose: () => void
    children: React.ReactNode
}

// The menu is anchored to a zero-size box at the point.
function pointAnchor([x, y]: [number, number]) {
    return {
        getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }),
    }
}

export function ContextMenu({ opened, position, onClose, children }: ContextMenuProps) {
    const [x, y] = position
    const anchor = useMemo(() => pointAnchor([x, y]), [x, y])

    function handleOpenChange(open: boolean) {
        if (!open) {
            onClose()
        }
    }

    return (
        <Menu.Root open={opened} onOpenChange={handleOpenChange} modal={false}>
            <Menu.Portal>
                <Menu.Positioner
                    className={s.positioner}
                    anchor={anchor}
                    side="right"
                    align="start"
                    sideOffset={MENU_OFFSET_PX}
                    collisionPadding={COLLISION_PADDING_PX}
                    collisionAvoidance={COLLISION_AVOIDANCE}
                >
                    <Menu.Popup className={cx(menu.surface, s.popup)}>{children}</Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}

export type ContextMenuItemProps = {
    icon?: ReactNode
    /** Right-aligned after the label: text ("⌘K") or a KbdShortcut. */
    shortcut?: ReactNode
    disabled?: boolean
    onClick?: () => void
    children: ReactNode
}

export function ContextMenuItem({ icon, shortcut, disabled = false, onClick, children }: ContextMenuItemProps) {
    const content = (
        <>
            {icon ? <span className={menu.itemIcon}>{icon}</span> : null}
            <span className={menu.itemLabel}>{children}</span>
            {shortcut === undefined ? null : <span className={menu.itemShortcut}>{shortcut}</span>}
        </>
    )

    // Base UI keeps disabled items focusable, but arrow keys must skip them. A disabled item is therefore a plain
    // element outside the menu's keyboard list.
    if (disabled) {
        return (
            <div className={menu.item} role="menuitem" tabIndex={-1} aria-disabled="true" data-disabled="">
                {content}
            </div>
        )
    }

    return (
        <Menu.Item className={menu.item} onClick={() => onClick?.()}>
            {content}
        </Menu.Item>
    )
}

export type ContextMenuLabelProps = {
    children: ReactNode
}

export function ContextMenuLabel({ children }: ContextMenuLabelProps) {
    return <div className={menu.label}>{children}</div>
}

// A line between groups of items.
export function ContextMenuSeparator() {
    return <Menu.Separator className={menu.separator} />
}
