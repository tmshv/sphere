import type { ReactNode } from "react"
import s from "./statusbar.module.css"

export { StatusbarBadge } from "./StatusbarBadge"
export type { StatusbarBadgeProps, StatusbarBadgeTone, StatusbarBadgeWidth } from "./StatusbarBadge"
export { StatusbarButton } from "./StatusbarButton"
export type { StatusbarButtonLook, StatusbarButtonProps } from "./StatusbarButton"
export { StatusbarSelect } from "./StatusbarSelect"
export type { StatusbarSelectProps } from "./StatusbarSelect"

export type StatusbarProps = {
    children: ReactNode
}

export function Statusbar({ children }: StatusbarProps) {
    return <div className={s.statusbar}>{children}</div>
}
