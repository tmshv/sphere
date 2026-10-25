import { Menu } from "@base-ui/react/menu"
import { type ReactNode, useMemo } from "react"
import { Text } from "../Text"
import s from "./context-menu.module.css"

// Mantine 5 Menu: the dropdown sits 10px to the right of the point.
const MENU_OFFSET_PX = 10
// Mantine 5 shifts and flips (floating-ui) with no padding: the menu may touch the window edge.
const COLLISION_PADDING_PX = 0
// Flip to the other side, then shift along the edge instead of flipping the alignment.
const COLLISION_AVOIDANCE = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const

export type ContextMenuProps = {
    opened: boolean
    position: [number, number]
    onClose: () => void
    children: React.ReactNode
}

// The menu is anchored to a zero-size box at the point, like Mantine's fixed target div.
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
                    <Menu.Popup className={s.dropdown}>{children}</Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}

export type ContextMenuItemProps = {
    icon?: ReactNode
    shortcut?: string
    disabled?: boolean
    onClick?: () => void
    children: ReactNode
}

export function ContextMenuItem({ icon, shortcut, disabled = false, onClick, children }: ContextMenuItemProps) {
    return (
        <Menu.Item className={s.item} disabled={disabled} onClick={() => onClick?.()}>
            {icon ? <div className={s.itemIcon}>{icon}</div> : null}
            <div className={s.itemLabel}>{children}</div>
            {shortcut === undefined ? null : (
                <div>
                    <Text tone={"dimmed"}>{shortcut}</Text>
                </div>
            )}
        </Menu.Item>
    )
}

export type ContextMenuLabelProps = {
    children: ReactNode
}

export function ContextMenuLabel({ children }: ContextMenuLabelProps) {
    return <div className={s.label}>{children}</div>
}
