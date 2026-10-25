import type { CSSProperties } from "react"

// Mantine 5 Text `truncate`: a single line that ends in an ellipsis.
export const TRUNCATE: CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}
