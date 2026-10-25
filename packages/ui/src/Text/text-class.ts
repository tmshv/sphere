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

/** Mantine 5 Text `truncate`: a single line that ends in an ellipsis. Shared by the rows that ellipsize. */
export const truncateClass = s.truncate
export const noSelectClass = s.noSelect
export const selectableClass = s.selectable

type TextClassOptions = {
    tone?: TextTone
    weight?: TextWeight
    uppercase?: boolean
    /** Extra classes, for the in-package rows that compose a Text with their own layout rules. */
    extra?: Array<string | undefined>
}

/** The class list of `Text`, for in-package components that need to add classes (the public `Text` takes none). */
export function textClassName({ tone = "default", weight, uppercase = false, extra = [] }: TextClassOptions): string {
    const classes = [s.text, TONE_CLASS[tone], weight && WEIGHT_CLASS[weight], uppercase && s.uppercase, ...extra]
    return classes.filter(Boolean).join(" ")
}
