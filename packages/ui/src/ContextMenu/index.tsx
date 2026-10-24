import { Menu } from "@mantine/core"
import type { ReactNode } from "react"
import { Text } from "../Text"

export type ContextMenuProps = {
    opened: boolean
    position: [number, number]
    onClose: () => void
    children: React.ReactNode
}

export function ContextMenu({ opened, position, onClose, children }: ContextMenuProps) {
    return (
        <Menu
            shadow="md"
            width={200}
            opened={opened}
            position={"right-start"}
            offset={10}
            closeOnClickOutside={true}
            onClose={onClose}
        >
            <Menu.Target>
                <div
                    style={{
                        position: "fixed",
                        left: position[0],
                        top: position[1],
                    }}
                />
            </Menu.Target>

            <Menu.Dropdown>{children}</Menu.Dropdown>
        </Menu>
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
        <Menu.Item
            icon={icon}
            disabled={disabled}
            onClick={() => onClick?.()}
            rightSection={shortcut === undefined ? undefined : <Text tone={"dimmed"}>{shortcut}</Text>}
        >
            {children}
        </Menu.Item>
    )
}

export type ContextMenuLabelProps = {
    children: ReactNode
}

export function ContextMenuLabel({ children }: ContextMenuLabelProps) {
    return <Menu.Label>{children}</Menu.Label>
}
