import { ActionIcon, Flex, Space } from "@mantine/core"
import type { TablerIconProps } from "@tabler/icons"
import type { CSSProperties } from "react"
import { GAP_PX } from "../Layout"

const SPACER_STYLE: CSSProperties = { flex: 1 }
const PADDED_STYLE: CSSProperties = { paddingLeft: GAP_PX.sm, paddingRight: GAP_PX.sm }
const ICON_SIZE_PX = 16

export type ActionBarItem = {
    name: string
    label: string
    icon: React.FC<TablerIconProps>
    color?: TablerIconProps["color"]
    disabled?: boolean
}

export type ActionBarOnClick = (name: string) => void

export type ActionBarProps = {
    items: Array<ActionBarItem | null>
    onClick: ActionBarOnClick
    /** Insets the bar horizontally by the standard gap. */
    padded?: boolean
}

export function ActionBar({ items, onClick, padded = false }: ActionBarProps) {
    return (
        <Flex direction={"row"} gap={"xs"} style={padded ? PADDED_STYLE : undefined}>
            {items.map((item, i) => {
                if (!item) {
                    return <Space key={`separator-before-${items[i + 1]?.name ?? "end"}`} style={SPACER_STYLE} />
                }
                const { name, label, icon: Icon, color, disabled = false } = item

                return (
                    <ActionIcon
                        key={name}
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
                        <Icon size={ICON_SIZE_PX} color={color} />
                    </ActionIcon>
                )
            })}
        </Flex>
    )
}
