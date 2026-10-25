import type { CSSProperties, ReactNode } from "react"
import { ALIGN_ITEMS, type Align } from "./align"
import { GAP_PX, type Gap } from "./gap"
import s from "./row.module.css"

export type Justify = "start" | "end" | "between"

const JUSTIFY_CONTENT: Record<Justify, string> = {
    start: "flex-start",
    end: "flex-end",
    between: "space-between",
}

export type RowProps = {
    gap?: Gap
    align?: Align
    justify?: Justify
    /** Gives every child equal width. */
    grow?: boolean
    className?: string
    style?: CSSProperties
    children?: ReactNode
}

export function Row({ gap, align, justify, grow = false, className, style, children }: RowProps) {
    const layout: CSSProperties = {
        display: "flex",
        flexDirection: "row",
        gap: gap ? GAP_PX[gap] : undefined,
        alignItems: align ? ALIGN_ITEMS[align] : undefined,
        justifyContent: justify ? JUSTIFY_CONTENT[justify] : undefined,
    }

    return (
        <div
            className={[grow ? s.grow : undefined, className].filter(Boolean).join(" ") || undefined}
            style={{ ...layout, ...style }}
        >
            {children}
        </div>
    )
}
