import type { MouseEvent, ReactNode, Ref } from "react"
import { ButtonBase, cx } from "../internal"
import s from "./statusbar-button.module.css"

/** How a toggled-on button shows: a yellow glyph, or a grey body behind the glyph. */
export type StatusbarButtonLook = "accent" | "fill"

export type StatusbarButtonProps = {
    icon: ReactNode
    /** Names the button for assistive tech and shows as its tooltip. */
    label: string
    onClick: () => void
    disabled?: boolean
    /** Toggled on (`aria-pressed`); leave undefined for a button that is not a toggle. */
    active?: boolean
    /** How a toggled-on button shows (default `accent`). */
    activeLook?: StatusbarButtonLook
    /** Called on right click, after the native context menu is suppressed. Not called when disabled. */
    onContextMenu?: () => void
    ref?: Ref<HTMLButtonElement>
}

/** A small glyph button for the statusbar. */
export function StatusbarButton({
    icon,
    label,
    onClick,
    disabled = false,
    active,
    activeLook = "accent",
    onContextMenu,
    ref,
}: StatusbarButtonProps) {
    function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
        if (disabled || !onContextMenu) {
            return
        }
        event.preventDefault()
        onContextMenu()
    }

    return (
        <ButtonBase
            shape="glyph"
            size="sm"
            label={label}
            active={active}
            disabled={disabled}
            className={cx(s.button, activeLook === "fill" && s.fill)}
            onClick={onClick}
            onContextMenu={handleContextMenu}
            ref={ref}
        >
            {icon}
        </ButtonBase>
    )
}
