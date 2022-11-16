import { Menu } from '@mantine/core';
import { useEffect, useState } from "react";
import { useToggle } from '@mantine/hooks';

export type ContextMenuProps = {
    children: React.ReactNode
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children }) => {
    const [showContext, toggleShowContext] = useToggle<boolean>();
    const [contextCoord, setContextCoord] = useState<[number, number]>([0, 0]);

    useEffect(() => {
        const callback = (event: MouseEvent) => {
            const xPos = event.pageX;
            const yPos = event.pageY;

            toggleShowContext(true)
            setContextCoord([xPos, yPos])
            event.preventDefault();
            return false;
        }

        document.addEventListener("contextmenu", callback, {
            capture: true
        });

        return () => {
            document.removeEventListener("contextmenu", callback, {
                capture: true
            });
        }
    }, [])

    return (
        <Menu
            shadow="md"
            width={200}
            opened={showContext}
            position={"right-start"}
            offset={10}
            closeOnClickOutside={true}
            onClose={() => {
                toggleShowContext(false)
            }}
        >
            <Menu.Target>
                <div style={{
                    position: "absolute",
                    left: contextCoord[0],
                    top: contextCoord[1],
                }}></div>
            </Menu.Target>

            <Menu.Dropdown>
                {children}
            </Menu.Dropdown>
        </Menu>
    );
}
