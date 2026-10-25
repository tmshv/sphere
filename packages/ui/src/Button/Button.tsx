import { Button as BaseButton } from "@base-ui/react/button"
import type { ReactNode } from "react"
import { unstyledButton } from "../internal"
import s from "./button.module.css"

export type ButtonVariant = "primary" | "secondary"

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: s.primary,
    secondary: s.secondary,
}

export type ButtonProps = {
    variant?: ButtonVariant
    type?: "button" | "submit"
    disabled?: boolean
    onClick?: () => void
    children: ReactNode
}

export function Button({ variant = "primary", type = "button", disabled, onClick, children }: ButtonProps) {
    const classes = [unstyledButton, s.button, VARIANT_CLASS[variant]]

    return (
        <BaseButton className={classes.join(" ")} type={type} disabled={disabled} onClick={() => onClick?.()}>
            <div className={s.inner}>
                <span className={s.label}>{children}</span>
            </div>
        </BaseButton>
    )
}
