import type { MouseEventHandler, ReactNode } from "react"
import { unstyledButton } from "../internal"
import { Row } from "../Layout"
import s from "./outline-item.module.css"

export type OutlineItemProps = {
    label: string
    active?: boolean
    icon?: ReactNode
    extra?: ReactNode
    onClick?: MouseEventHandler<HTMLButtonElement>
}

export function OutlineItem({ label, active, icon, extra, onClick }: OutlineItemProps) {
    const classes = [unstyledButton, s.button, active && s.active]
    return (
        <Row justify="between" gap="xs">
            {!icon ? null : <div className={s.icon}>{icon}</div>}
            <button type="button" className={classes.filter(Boolean).join(" ")} onClick={onClick}>
                {label}
            </button>
            {extra}
        </Row>
    )
}
