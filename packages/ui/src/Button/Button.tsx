import type { ReactNode } from "react"
import { ButtonBase } from "../internal"

export type ButtonVariant = "primary" | "secondary"

export type ButtonProps = {
    variant?: ButtonVariant
    type?: "button" | "submit"
    disabled?: boolean
    onClick?: () => void
    children: ReactNode
}

/** A control-height push button: `primary` is the accent default button, `secondary` the bordered control body. */
export function Button({ variant = "primary", type = "button", disabled, onClick, children }: ButtonProps) {
    return (
        <ButtonBase shape="push" tone={variant} type={type} disabled={disabled} onClick={onClick}>
            {children}
        </ButtonBase>
    )
}
