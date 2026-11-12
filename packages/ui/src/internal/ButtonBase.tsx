import { Button as BaseButton } from "@base-ui/react/button"
import type { ReactNode } from "react"
import s from "./button-base.module.css"

/** push: a bordered push button with text. glyph: a borderless glyph. bordered-glyph: a glyph in a push-button
 * body. plain: the reset alone, for a small control that draws itself (a disclosure chevron). strip: plain, for a
 * control that fills a strip edge to edge (a section header), with its focus ring drawn inside. */
export type ButtonShape = "push" | "glyph" | "bordered-glyph" | "plain" | "strip"
export type ButtonTone = "primary" | "secondary"
export type ButtonSize = "sm" | "md"

export type ButtonBaseProps = {
    shape: ButtonShape
    size?: ButtonSize
    tone?: ButtonTone
    /** Toggled on. Defined makes the button a toggle (`aria-pressed`); undefined leaves it a plain button. */
    active?: boolean
    disabled?: boolean
    /** For a disclosure button: whether what it shows is open (`aria-expanded`). */
    expanded?: boolean
    /** The id of the element the button shows or hides (`aria-controls`). */
    controls?: string
    /** Names the button for assistive tech and shows as its tooltip. */
    label?: string
    /** Shows label as the native `title` tooltip (default). False for a button with its own Tooltip; the name stays. */
    nativeTooltip?: boolean
    type?: "button" | "submit"
    /** Layout only (flex, margin); never colour. */
    className?: string
    onClick?: () => void
    children: ReactNode
}

// The one place that owns how a button behaves: reset, cursor, focus ring, press and disabled.
export function ButtonBase({
    shape,
    size = "md",
    tone = "secondary",
    active,
    disabled,
    expanded,
    controls,
    label,
    nativeTooltip = true,
    type = "button",
    className,
    onClick,
    children,
}: ButtonBaseProps) {
    const classes = className === undefined ? s.root : `${s.root} ${className}`

    return (
        <BaseButton
            className={classes}
            type={type}
            disabled={disabled}
            aria-label={label}
            title={nativeTooltip ? label : undefined}
            aria-pressed={active}
            aria-expanded={expanded}
            aria-controls={controls}
            data-shape={shape}
            data-size={size}
            data-tone={tone}
            data-active={active === true ? "" : undefined}
            onClick={() => onClick?.()}
        >
            {children}
        </BaseButton>
    )
}
