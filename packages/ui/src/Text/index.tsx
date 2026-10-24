import type { CSSProperties, ReactNode } from "react"
import s from "./text.module.css"

export type TextTone = "default" | "dimmed" | "warning"
export type TextWeight = "normal" | "medium" | "semibold"

const TONE_CLASS: Record<TextTone, string | undefined> = {
    default: undefined,
    dimmed: s.dimmed,
    warning: s.warning,
}

const WEIGHT_CLASS: Record<TextWeight, string> = {
    normal: s.weightNormal,
    medium: s.weightMedium,
    semibold: s.weightSemibold,
}

export type TextProps = {
    tone?: TextTone
    weight?: TextWeight
    uppercase?: boolean
    style?: CSSProperties
    children?: ReactNode
}

export function Text({ tone = "default", weight, uppercase = false, style, children }: TextProps) {
    const classes = [s.text, TONE_CLASS[tone], weight && WEIGHT_CLASS[weight], uppercase && s.uppercase]
    return (
        <div className={classes.filter(Boolean).join(" ")} style={style}>
            {children}
        </div>
    )
}

export type HeadingProps = {
    children?: ReactNode
}

export function Heading({ children }: HeadingProps) {
    return <h3 className={s.heading}>{children}</h3>
}
