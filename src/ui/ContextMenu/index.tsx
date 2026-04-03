import { Menu } from "@mantine/core"

export type ContextMenuProps = {
    opened: boolean
    position: [number, number]
    onClose: () => void
    children: React.ReactNode
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ opened, position, onClose, children }) => {
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
