import { Paper } from "@mantine/core"
import type { CSSProperties, ReactNode } from "react"
import { GAP_PX } from "../Layout"

export type SurfaceProps = {
    style?: CSSProperties
    children?: ReactNode
}

export function Surface({ style, children }: SurfaceProps) {
    return (
        <Paper p={GAP_PX.sm} style={style}>
            {children}
        </Paper>
    )
}
