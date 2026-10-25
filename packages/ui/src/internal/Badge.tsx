import type { ReactNode } from "react"
import s from "./Badge.module.css"

export type BadgeSize = "xs" | "sm"
/** "outline" is Mantine's outline variant in the dark colour. */
export type BadgeVariant = "light" | "filled" | "outline"
export type BadgeRadius = "xs" | "sm" | "xl"

const SIZE_CLASS: Record<BadgeSize, string> = {
    xs: s.sizeXs,
    sm: s.sizeSm,
}

const RADIUS_CLASS: Record<BadgeRadius, string> = {
    xs: s.radiusXs,
    sm: s.radiusSm,
    xl: s.radiusXl,
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
    light: s.light,
    filled: s.filled,
    outline: s.outline,
}

export type BadgeProps = {
    size: BadgeSize
    variant: BadgeVariant
    radius: BadgeRadius
    className?: string
    title?: string
    children: ReactNode
}

export function Badge({ size, variant, radius, className, title, children }: BadgeProps) {
    const classes = [s.badge, SIZE_CLASS[size], RADIUS_CLASS[radius], VARIANT_CLASS[variant], className]
    return (
        <div className={classes.filter(Boolean).join(" ")} title={title}>
            <span className={s.inner}>{children}</span>
        </div>
    )
}
