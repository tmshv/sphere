import { type HTMLAttributes, type ReactNode, forwardRef } from "react"
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

// Only what a tooltip trigger merges in: no style, so size and variant stay the one way to look different.
type TriggerProps = Pick<
    HTMLAttributes<HTMLDivElement>,
    | "id"
    | "aria-describedby"
    | "onBlur"
    | "onClick"
    | "onFocus"
    | "onMouseEnter"
    | "onMouseLeave"
    | "onMouseMove"
    | "onPointerDown"
    | "onPointerEnter"
    | "onPointerLeave"
    | "onPointerMove"
>

export type BadgeProps = {
    size: BadgeSize
    variant: BadgeVariant
    radius: BadgeRadius
    className?: string
    title?: string
    children: ReactNode
} & TriggerProps

// Forwards its ref and the props a tooltip trigger hands down, as Mantine's Badge did.
export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
    { size, variant, radius, className, title, children, ...rest },
    ref,
) {
    const classes = [s.badge, SIZE_CLASS[size], RADIUS_CLASS[radius], VARIANT_CLASS[variant], className]
    return (
        <div {...rest} ref={ref} className={classes.filter(Boolean).join(" ")} title={title}>
            <span className={s.inner}>{children}</span>
        </div>
    )
})
