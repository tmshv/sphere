import { type HTMLAttributes, type ReactNode, forwardRef } from "react"
import { cx } from "./cx"
import s from "./Badge.module.css"

export type BadgeSize = "xs" | "sm"
export type BadgeVariant = "light" | "filled" | "outline"

const SIZE_CLASS: Record<BadgeSize, string> = {
    xs: s.sizeXs,
    sm: s.sizeSm,
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
    className?: string
    title?: string
    children: ReactNode
} & TriggerProps

// Forwards its ref and the props a tooltip trigger hands down, as Mantine's Badge did.
export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
    { size, variant, className, title, children, ...rest },
    ref,
) {
    const classes = cx(s.badge, SIZE_CLASS[size], VARIANT_CLASS[variant], className)
    return (
        <div {...rest} ref={ref} className={classes} title={title}>
            <span className={s.inner}>{children}</span>
        </div>
    )
})
