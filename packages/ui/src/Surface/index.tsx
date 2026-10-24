import type { CSSProperties, ReactNode } from "react"
import s from "./surface.module.css"

export type SurfaceProps = {
    style?: CSSProperties
    children?: ReactNode
}

export function Surface({ style, children }: SurfaceProps) {
    return (
        <div className={s.surface} style={style}>
            {children}
        </div>
    )
}
