import type { ReactNode } from "react"
import { cx } from "../internal"
import s from "./statusbar-badge.module.css"

export type StatusbarBadgeWidth = "auto" | "short" | "long"
export type StatusbarBadgeTone = "default" | "error"

export type StatusbarBadgeProps = {
    children: ReactNode
    title?: string
    width?: StatusbarBadgeWidth
    tone?: StatusbarBadgeTone
}

const WIDTH_CLASS: Record<StatusbarBadgeWidth, string | undefined> = {
    auto: undefined,
    short: s.short,
    long: s.long,
}

export function StatusbarBadge({ children, title, width = "auto", tone = "default" }: StatusbarBadgeProps) {
    return (
        <span className={cx(s.widget, WIDTH_CLASS[width], tone === "error" && s.error)} title={title}>
            {children}
        </span>
    )
}
