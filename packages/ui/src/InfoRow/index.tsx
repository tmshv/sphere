import type { CSSProperties, ReactNode } from "react"
import { Row } from "../Layout"
import { NO_SELECT, SELECTABLE } from "../selection"
import { Text } from "../Text"
import { TRUNCATE } from "../Text/truncate"

// A row pairs something long with something short: a caption with a value, or a
// column value with how often it occurs. Only the long side ellipsizes.
// Letting both shrink divides the overflow between them in proportion to their
// length, which takes a couple of pixels off the short side — enough to hide a
// four-digit count behind its own ellipsis.
const GIVES_WAY: CSSProperties = {
    // Without this a flex child refuses to shrink below its text.
    minWidth: 0,
}
const STAYS_WHOLE: CSSProperties = {
    flexShrink: 0,
}

const CAPTION_STYLE: CSSProperties = { ...TRUNCATE, ...NO_SELECT, ...STAYS_WHOLE }
const DATA_LABEL_STYLE: CSSProperties = { ...TRUNCATE, ...SELECTABLE, ...GIVES_WAY }
const DATA_VALUE_STYLE: CSSProperties = { ...TRUNCATE, ...SELECTABLE, ...GIVES_WAY }
const COUNT_STYLE: CSSProperties = { ...TRUNCATE, ...SELECTABLE, ...STAYS_WHOLE }

export type InfoRowProps = {
    label: string
    value: ReactNode
    /**
     * Set when the label is data rather than a caption — a column name, a column
     * value. Data can be copied, and data is what gives way when the row runs
     * out of room.
     */
    labelIsData?: boolean
}

export function InfoRow({ label, value, labelIsData = false }: InfoRowProps) {
    return (
        <Row justify="between" gap="xs" align="center">
            <Text tone="dimmed" style={labelIsData ? DATA_LABEL_STYLE : CAPTION_STYLE}>
                {label}
            </Text>
            <Text style={labelIsData ? COUNT_STYLE : DATA_VALUE_STYLE}>{value}</Text>
        </Row>
    )
}
