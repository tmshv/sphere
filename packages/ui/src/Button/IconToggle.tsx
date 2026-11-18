import type { ReactNode } from "react"
import { ButtonBase } from "../internal"
import type { IconButtonSize } from "./IconButton"
import s from "./icon-toggle.module.css"

/** One state of an IconToggle: the glyph it shows and the name it has while in that state, usually the action a
 * click takes ("Hide" while shown). */
export type IconToggleState = {
    icon: ReactNode
    label: string
}

export type IconToggleProps = {
    value: boolean
    /** Shown while value is true. */
    on: IconToggleState
    /** Shown while value is false, with the glyph dimmed to the tertiary label colour. */
    off: IconToggleState
    onChange: (value: boolean) => void
    disabled?: boolean
    size?: IconButtonSize
}

/** A glyph button with two states, each with its own glyph and name (a visibility bulb, a lock). A click reports the
 * other state. */
export function IconToggle({ value, on, off, onChange, disabled, size = "md" }: IconToggleProps) {
    const state = value ? on : off

    return (
        <ButtonBase
            shape="glyph"
            size={size}
            label={state.label}
            disabled={disabled}
            className={value ? undefined : s.off}
            onClick={() => onChange(!value)}
        >
            {state.icon}
        </ButtonBase>
    )
}
