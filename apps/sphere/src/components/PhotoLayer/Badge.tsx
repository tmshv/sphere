import type { ReactNode } from "react"
import s from "./Badge.module.css"

export type BadgeProps = {
    top?: number
    right?: number
    children?: ReactNode
}

export function Badge({ top, right, children }: BadgeProps) {
    return (
        <div
            className={s.badge}
            style={{
                position: "absolute",
                top: top ?? 0,
                right: right ?? 0,
            }}
        >
            {children}
        </div>
    )
}
