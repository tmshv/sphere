import type { ReactNode } from "react"
import { Row } from "../Layout"
import { noSelectClass, selectableClass, textClassName, truncateClass } from "../Text/text-class"
import s from "./info-row.module.css"

const CAPTION_CLASS = textClassName({ tone: "dimmed", extra: [truncateClass, noSelectClass, s.staysWhole] })
const DATA_LABEL_CLASS = textClassName({ tone: "dimmed", extra: [truncateClass, selectableClass, s.givesWay] })
const DATA_VALUE_CLASS = textClassName({ extra: [truncateClass, selectableClass, s.givesWay] })
const COUNT_CLASS = textClassName({ extra: [truncateClass, selectableClass, s.staysWhole] })

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
            <div className={labelIsData ? DATA_LABEL_CLASS : CAPTION_CLASS}>{label}</div>
            <div className={labelIsData ? COUNT_CLASS : DATA_VALUE_CLASS}>{value}</div>
        </Row>
    )
}
