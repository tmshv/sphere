import type { ReactNode } from "react"
import { Badge } from "../internal"
import s from "./statusbar-badge.module.css"

export type StatusbarBadgeWidth = "auto" | "short" | "long"
export type StatusbarBadgeTone = "default" | "error"

export type StatusbarBadgeProps = {
    children: ReactNode
    title?: string
    width?: StatusbarBadgeWidth
    tone?: StatusbarBadgeTone
}

export function StatusbarBadge({ children, title, width = "auto", tone = "default" }: StatusbarBadgeProps) {
    const isError = tone === "error"
    const classes = [s.widget, width === "short" && s.short, width === "long" && s.long, isError && s.error]

    return (
        <Badge
            className={classes.filter(Boolean).join(" ")}
            title={title}
            radius="sm"
            size="sm"
            variant={isError ? "filled" : "light"}
        >
            {children}
        </Badge>
    )
}
