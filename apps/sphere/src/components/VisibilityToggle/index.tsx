import { IconBulb, IconBulbOff } from "@sphere/icons"
import { IconToggle } from "@sphere/ui"

export const HIDE_LABEL = "Hide"
export const SHOW_LABEL = "Show"

const ICON_SIZE = 16

export type VisibilityToggleProps = {
    visible: boolean
    /** Colour of the lit bulb; the glyph colour when omitted. */
    color?: string
    onChange: (visible: boolean) => void
}

/** The bulb that shows or hides an outline row: lit while visible, unlit (and dimmed) while hidden. */
export function VisibilityToggle({ visible, color, onChange }: VisibilityToggleProps) {
    return (
        <IconToggle
            value={visible}
            on={{ icon: <IconBulb size={ICON_SIZE} color={color} />, label: HIDE_LABEL }}
            off={{ icon: <IconBulbOff size={ICON_SIZE} />, label: SHOW_LABEL }}
            onChange={onChange}
        />
    )
}
