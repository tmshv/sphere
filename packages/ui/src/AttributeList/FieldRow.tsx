import type { ReactNode } from "react"
import type { FieldEntry } from "."
import { Badge, Skeleton } from "../internal"
import { Row, Stack } from "../Layout"
import { Text } from "../Text"
import { selectableClass, textClassName, truncateClass } from "../Text/text-class"
import s from "./field-row.module.css"
import { NumericSummary } from "./NumericSummary"
import { StringSummary } from "./StringSummary"

const SKELETON_HEIGHT = 28

const NAME_CLASS = textClassName({ weight: "medium", extra: [truncateClass, selectableClass, s.name] })
const KEEP_WHOLE_CLASS = textClassName({ tone: "dimmed", extra: [s.keepWhole] })

export type FieldRowProps = {
    field: FieldEntry
}

function renderSummary(field: FieldEntry): ReactNode {
    switch (field.summary.kind) {
        case "numeric":
            return <NumericSummary summary={field.summary} />
        case "string":
            return <StringSummary summary={field.summary} />
        case "error":
            return <Text tone="dimmed">stats unavailable</Text>
        case "loading":
            return <Skeleton height={SKELETON_HEIGHT} />
    }
}

export function FieldRow({ field }: FieldRowProps) {
    return (
        <Stack gap="xs">
            <Row gap="xs" align="center">
                <div className={NAME_CLASS}>{field.name}</div>
                <Badge size="xs" variant="light" radius="sm" className={s.keepWhole}>
                    {field.type}
                </Badge>
                {field.nullCount && field.nullCount > 0 ? (
                    <div className={KEEP_WHOLE_CLASS}>{field.nullCount} null</div>
                ) : null}
            </Row>
            {renderSummary(field)}
        </Stack>
    )
}
