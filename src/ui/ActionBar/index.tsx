import { ActionIcon, Flex, MantineStyleSystemProps, Space, Tooltip } from '@mantine/core';
import type { FloatingPosition } from '@mantine/core/lib/Floating';
import { TablerIconProps } from '@tabler/icons';

export type ActionBarItem = {
    name: string,
    label: string,
    icon: React.FC<TablerIconProps>
    color?: TablerIconProps["color"],
    disabled?: boolean
}

export type ActionBarOnClick = (name: string) => void

export type ActionBarProps = MantineStyleSystemProps & {
    items: Array<ActionBarItem | null>
    onClick: ActionBarOnClick
    tooltipPosition: FloatingPosition
}

export const ActionBar: React.FC<ActionBarProps> = ({ items, onClick, tooltipPosition, ...props }) => (
    <Flex direction={"row"} gap={"xs"} {...props}>
        {items.map((item, i) => {
            if (!item) {
                return (
                    <Space key={`space-${i}`} style={{ flex: 1 }} />
                )
            }
            const { name, label, icon: Icon, color, disabled = false } = item

            return (
                <Tooltip
                    key={name}
                    disabled
                    label={label}
                    position={tooltipPosition}
                    openDelay={1000}
                    closeDelay={250}
                    transitionDuration={0}
                >
                    <ActionIcon size={"md"} disabled={disabled}
                        sx={{
                            '&[data-disabled]': {
                                opacity: 0.5,
                                backgroundColor: "#00000000",
                                border: "none",
                            },
                        }}
                        onClick={() => {
                            onClick(name)
                        }}
                    >
                        <Icon size={16} color={color} />
                    </ActionIcon>
                </Tooltip>
            )
        })}
    </Flex>
);
