import { ActionIcon, Flex, type MantineStyleSystemProps, Space, Tooltip } from "@mantine/core"
import type { FloatingPosition } from "@mantine/core/lib/Floating"
import type { TablerIconProps } from "@tabler/icons"

export type ActionBarItem = {
    name: string
    label: string
    icon: React.FC<TablerIconProps>
    color?: TablerIconProps["color"]
    disabled?: boolean
}

export type ActionBarOnClick = (name: string) => void

export type ActionBarProps = MantineStyleSystemProps & {
    items: Array<ActionBarItem | null>
    onClick: ActionBarOnClick
    tooltipPosition: FloatingPosition
}

export function ActionBar({ items, onClick, tooltipPosition, ...props }: ActionBarProps) {
    return (
        <Flex direction={"row"} gap={"xs"} {...props}>
            {items.map((item, i) => {
                if (!item) {
                    return <Space key={`separator-before-${items[i + 1]?.name ?? "end"}`} style={{ flex: 1 }} />
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
                        <ActionIcon
                            size={"md"}
                            aria-label={label}
                            disabled={disabled}
                            sx={{
                                "&[data-disabled]": {
                                    opacity: 0.5,
                                    backgroundColor: "#00000000",
                                    border: "none",
                                    cursor: "not-allowed",
                                    pointerEvents: "none",
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
    )
}
