import { Button as BaseButton } from "@base-ui/react/button"
import type { ReactNode } from "react"
import iconButton from "../Button/icon-button.module.css"
import { unstyledButton } from "../internal"
import s from "./statusbar-button.module.css"

export type StatusbarButtonLook = "accent" | "fill"

export type StatusbarButtonProps = {
    icon: ReactNode
    /** Names the button for assistive tech and shows as its tooltip. */
    label: string
    onClick: () => void
    disabled?: boolean
    active?: boolean
    /** How an active button stands out: a yellow icon, or a filled background. */
    activeLook?: StatusbarButtonLook
}

export function StatusbarButton({
    icon,
    label,
    onClick,
    disabled = false,
    active,
    activeLook = "accent",
}: StatusbarButtonProps) {
    const isFilled = active === true && activeLook === "fill"
    const isAccent = active === true && activeLook === "accent"
    const classes = [
        unstyledButton,
        iconButton.iconButton,
        iconButton.sizeSm,
        s.button,
        isAccent && s.accent,
        isFilled && s.fill,
    ]

    return (
        <BaseButton
            className={classes.filter(Boolean).join(" ")}
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
