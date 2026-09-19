import type { CSSProperties } from "react"

/**
 * Chrome — headings, captions, badges. Dragging across a panel should pick out
 * the data it shows, not the words that label it.
 */
export const NO_SELECT: CSSProperties = {
    userSelect: "none",
}

/**
 * Data worth copying. Explicit rather than left to `auto`, so it stays
 * selectable inside a container that turned selection off.
 */
export const SELECTABLE: CSSProperties = {
    userSelect: "text",
}
