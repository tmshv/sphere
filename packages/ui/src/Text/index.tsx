import type { CSSProperties, ReactNode } from "react"
import s from "./text.module.css"
import { type TextTone, type TextWeight, textClassName } from "./text-class"

export type { TextTone, TextWeight }

export type TextProps = {
    tone?: TextTone
    weight?: TextWeight
    uppercase?: boolean
    style?: CSSProperties
    children?: ReactNode
}

export function Text({ tone = "default", weight, uppercase = false, style, children }: TextProps) {
    return (
        <div className={textClassName({ tone, weight, uppercase })} style={style}>
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
