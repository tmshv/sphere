import type { ReactNode } from "react"
import { IconButton } from "../Button"

export type StatusbarButtonProps = {
    icon: ReactNode
    /** Names the button for assistive tech and shows as its tooltip. */
    label: string
    onClick: () => void
    disabled?: boolean
    /** Toggled on: the glyph turns accent. */
    active?: boolean
}

/** A small glyph button for the statusbar. */
export function StatusbarButton({ icon, label, onClick, disabled = false, active }: StatusbarButtonProps) {
    return <IconButton icon={icon} label={label} onClick={onClick} disabled={disabled} active={active} size="sm" />
}
