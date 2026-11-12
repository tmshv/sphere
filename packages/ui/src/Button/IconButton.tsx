import type { ReactNode } from "react"
import { ButtonBase, type ButtonShape } from "../internal"

export type IconButtonSize = "sm" | "md"
/** glyph: a borderless glyph, as in sidebar action bars. bordered: a square push-button body, for toolbars over
 * the map. */
export type IconButtonVariant = "glyph" | "bordered"

const SHAPE: Record<IconButtonVariant, ButtonShape> = {
    glyph: "glyph",
    bordered: "bordered-glyph",
}

export type IconButtonProps = {
    icon: ReactNode
    label: string
    onClick: () => void
    disabled?: boolean
    /** Toggled on (`aria-pressed`); leave undefined for a button that is not a toggle. */
    active?: boolean
    size?: IconButtonSize
    variant?: IconButtonVariant
}

export function IconButton({
    icon,
    label,
    onClick,
    disabled,
    active,
    size = "md",
    variant = "glyph",
}: IconButtonProps) {
    return (
        <ButtonBase
            shape={SHAPE[variant]}
            size={size}
            label={label}
            active={active}
            disabled={disabled}
            onClick={onClick}
        >
            {icon}
        </ButtonBase>
    )
}
