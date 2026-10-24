import type { CSSProperties, ReactNode } from "react"
import { ALIGN_ITEMS, type Align } from "./align"
import { GAP_PX, type Gap } from "./gap"

export type StackProps = {
    gap?: Gap
    align?: Align
    className?: string
    style?: CSSProperties
    children?: ReactNode
}

export function Stack({ gap, align, className, style, children }: StackProps) {
    const layout: CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: gap ? GAP_PX[gap] : undefined,
        alignItems: align ? ALIGN_ITEMS[align] : undefined,
    }

    return (
        <div className={className} style={{ ...layout, ...style }}>
            {children}
        </div>
    )
}
