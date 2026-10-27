import { Button as BaseButton } from "@base-ui/react/button"
import type { ReactNode } from "react"
import { unstyledButton } from "../internal"
import s from "./icon-button.module.css"

export type IconButtonSize = "sm" | "md"
export type IconButtonAppearance = "subtle" | "solid"

const SIZE_CLASS: Record<IconButtonSize, string> = {
    sm: s.sizeSm,
    md: s.sizeMd,
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
    const classes = [unstyledButton, s.iconButton, SIZE_CLASS[size], filled ? s.filled : s.subtle]

    return (
        <BaseButton
            className={classes.join(" ")}
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={disabled}
            onClick={() => onClick()}
        >
            {icon}
        </BaseButton>
    )
}
