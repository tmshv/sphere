import { ActionIcon } from "@mantine/core"
import { IconBulb, IconBulbOff } from "@tabler/icons"

export const HIDE_LABEL = "Hide"
export const SHOW_LABEL = "Show"

const ICON_SIZE = 16
const BUTTON_HEIGHT = 30

export type VisibilityToggleProps = {
    visible: boolean
    /** Colour of the lit bulb; the theme's text colour when omitted. */
    color?: string
    onChange: (visible: boolean) => void
}

/** The bulb that shows or hides an outline row. Transparent, so it has no hover background. */
export function VisibilityToggle({ visible, color, onChange }: VisibilityToggleProps) {
    return (
        <ActionIcon
            variant={"transparent"}
            size={"md"}
            radius={"sm"}
            h={BUTTON_HEIGHT}
            aria-label={visible ? HIDE_LABEL : SHOW_LABEL}
            onClick={() => onChange(!visible)}
        >
            {visible ? <IconBulb size={ICON_SIZE} color={color} /> : <IconBulbOff size={ICON_SIZE} />}
        </ActionIcon>
    )
}
