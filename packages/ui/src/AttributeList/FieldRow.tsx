import type { CSSProperties, ReactNode } from "react"
import type { FieldEntry } from "."
import { Badge, Skeleton } from "../internal"
import { Row, Stack } from "../Layout"
import { SELECTABLE } from "../selection"
import { Text } from "../Text"
import { TRUNCATE } from "../Text/truncate"
import s from "./field-row.module.css"
import { NumericSummary } from "./NumericSummary"
import { StringSummary } from "./StringSummary"

const SKELETON_HEIGHT = 28

// The name is data — copyable, and the one part of the row allowed to
// ellipsize; its type and null count are short enough to always keep.
const NAME_STYLE: CSSProperties = { ...TRUNCATE, ...SELECTABLE, minWidth: 0 }
const KEEP_WHOLE: CSSProperties = { flexShrink: 0 }

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
                <Text weight="medium" style={NAME_STYLE}>
                    {field.name}
                </Text>
                <Badge size="xs" variant="light" radius="sm" className={s.keepWhole}>
                    {field.type}
                </Badge>
                {field.nullCount && field.nullCount > 0 ? (
                    <Text tone="dimmed" style={KEEP_WHOLE}>
                        {field.nullCount} null
                    </Text>
                ) : null}
            </Row>
            {renderSummary(field)}
        </Stack>
    )
}
