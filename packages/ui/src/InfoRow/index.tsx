import { Group, Text } from "@mantine/core"
import type { CSSProperties, FC, ReactNode } from "react"
import { NO_SELECT, SELECTABLE } from "../selection"

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

const CAPTION_STYLE: CSSProperties = { ...NO_SELECT, ...STAYS_WHOLE }
const DATA_LABEL_STYLE: CSSProperties = { ...SELECTABLE, ...GIVES_WAY }
const DATA_VALUE_STYLE: CSSProperties = { ...SELECTABLE, ...GIVES_WAY }
const COUNT_STYLE: CSSProperties = { ...SELECTABLE, ...STAYS_WHOLE }

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

export const InfoRow: FC<InfoRowProps> = ({ label, value, labelIsData = false }) => {
    return (
        <Group position={"apart"} spacing={"xs"} noWrap>
            <Text size={"xs"} color={"dimmed"} truncate style={labelIsData ? DATA_LABEL_STYLE : CAPTION_STYLE}>
                {label}
            </Text>
            <Text size={"xs"} truncate style={labelIsData ? COUNT_STYLE : DATA_VALUE_STYLE}>
                {value}
            </Text>
        </Group>
    )
}
