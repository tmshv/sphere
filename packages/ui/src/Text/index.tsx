import { Text as MantineText, Title } from "@mantine/core"
import type { CSSProperties, ReactNode } from "react"

export type TextTone = "default" | "dimmed" | "warning"
export type TextWeight = "normal" | "medium" | "semibold"

const TONE_COLOR: Record<TextTone, string | undefined> = {
    default: undefined,
    dimmed: "dimmed",
    warning: "orange",
}

const WEIGHT: Record<TextWeight, number> = {
    normal: 400,
    medium: 500,
    semibold: 600,
}

const HEADING_ORDER = 3

export type TextProps = {
    tone?: TextTone
    weight?: TextWeight
    uppercase?: boolean
    style?: CSSProperties
    children?: ReactNode
}

export function Text({ tone = "default", weight, uppercase = false, style, children }: TextProps) {
    return (
        <MantineText
            size={"xs"}
            color={TONE_COLOR[tone]}
            weight={weight ? WEIGHT[weight] : undefined}
            transform={uppercase ? "uppercase" : undefined}
            style={style}
        >
            {children}
        </MantineText>
    )
}

export type HeadingProps = {
    children?: ReactNode
}

export function Heading({ children }: HeadingProps) {
    return <Title order={HEADING_ORDER}>{children}</Title>
}
