import { IconBulb, IconBulbOff } from "@sphere/icons"
import { IconButton } from "../Button"
import s from "./visibility-toggle.module.css"

export const HIDE_LABEL = "Hide"
export const SHOW_LABEL = "Show"

const ICON_SIZE = 16

export type VisibilityToggleProps = {
    visible: boolean
    /** Colour of the lit bulb; the glyph colour when omitted. */
    color?: string
    onChange: (visible: boolean) => void
}

/** The bulb that shows or hides an outline row: a glyph button, with the unlit bulb in the tertiary label colour. */
export function VisibilityToggle({ visible, color, onChange }: VisibilityToggleProps) {
    const icon = visible ? (
        <IconBulb size={ICON_SIZE} color={color} />
    ) : (
        <IconBulbOff size={ICON_SIZE} className={s.off} />
    )

    return <IconButton icon={icon} label={visible ? HIDE_LABEL : SHOW_LABEL} onClick={() => onChange(!visible)} />
}
