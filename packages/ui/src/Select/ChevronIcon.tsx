import { IconSelector } from "@sphere/icons"

// The pop-up button's double chevron, sized for a 22px control.
const GLYPH_SIZE_PX = 14

export function ChevronIcon() {
    return <IconSelector size={GLYPH_SIZE_PX} aria-hidden="true" />
}
