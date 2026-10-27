import { IconBulb, IconBulbOff } from "@sphere/icons"
import iconButton from "../Button/icon-button.module.css"
import { unstyledButton } from "../internal"
import s from "./visibility-toggle.module.css"

export const HIDE_LABEL = "Hide"
export const SHOW_LABEL = "Show"

const ICON_SIZE = 16

const CLASS_NAME = [unstyledButton, iconButton.iconButton, iconButton.sizeMd, s.toggle].join(" ")

export type VisibilityToggleProps = {
    visible: boolean
    /** Colour of the lit bulb; the theme's text colour when omitted. */
    color?: string
    onChange: (visible: boolean) => void
}

/** The bulb that shows or hides an outline row. Transparent, so it has no hover background. */
export function VisibilityToggle({ visible, color, onChange }: VisibilityToggleProps) {
    return (
        <button
            type="button"
            className={CLASS_NAME}
            aria-label={visible ? HIDE_LABEL : SHOW_LABEL}
            onClick={() => onChange(!visible)}
        >
            {visible ? <IconBulb size={ICON_SIZE} color={color} /> : <IconBulbOff size={ICON_SIZE} />}
        </button>
    )
}
