import { Button as MantineButton } from "@mantine/core"
import type { ReactNode } from "react"

export type ButtonVariant = "primary" | "secondary"

const SECONDARY_COLOR = "gray"
const BUTTON_SIZE = "xs"

export type ButtonProps = {
    variant?: ButtonVariant
    type?: "button" | "submit"
    disabled?: boolean
    onClick?: () => void
    children?: ReactNode
}

export function Button({ variant = "primary", type = "button", disabled, onClick, children }: ButtonProps) {
    return (
        <MantineButton
            size={BUTTON_SIZE}
            color={variant === "secondary" ? SECONDARY_COLOR : undefined}
            type={type}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </MantineButton>
    )
}
