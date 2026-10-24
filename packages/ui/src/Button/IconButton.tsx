import { ActionIcon, type MantineSize } from "@mantine/core"
import type { ReactNode } from "react"

export type IconButtonSize = "sm" | "md"
export type IconButtonAppearance = "subtle" | "solid"

const ACTION_ICON_SIZE: Record<IconButtonSize, MantineSize> = {
    sm: "xs",
    md: "md",
}

export type IconButtonProps = {
    icon: ReactNode
    label: string
    onClick: () => void
    disabled?: boolean
    active?: boolean
    size?: IconButtonSize
    appearance?: IconButtonAppearance
}

export function IconButton({
    icon,
    label,
    onClick,
    disabled,
    active,
    size = "md",
    appearance = "subtle",
}: IconButtonProps) {
    const filled = appearance === "solid" && active === true

    return (
        <ActionIcon
            size={ACTION_ICON_SIZE[size]}
            variant={filled ? "filled" : "subtle"}
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={disabled}
            onClick={onClick}
        >
            {icon}
        </ActionIcon>
    )
}
