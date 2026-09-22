import { Badge, Group, Skeleton, Stack, Text } from "@mantine/core"
import type { CSSProperties, FC, ReactNode } from "react"
import type { FieldEntry } from "."
import { SELECTABLE } from "../selection"
import { NumericSummary } from "./NumericSummary"
import { StringSummary } from "./StringSummary"

const SKELETON_HEIGHT = 28

// The name is data — copyable, and the one part of the row allowed to
// ellipsize; its type and null count are short enough to always keep.
const NAME_STYLE: CSSProperties = { ...SELECTABLE, minWidth: 0 }
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
            return (
                <Text size={"xs"} color={"dimmed"}>
                    stats unavailable
                </Text>
            )
        case "loading":
            return <Skeleton height={SKELETON_HEIGHT} />
    }
}

export const FieldRow: FC<FieldRowProps> = ({ field }) => {
    return (
        <Stack spacing={4}>
            <Group spacing={"xs"} noWrap>
                <Text size={"xs"} weight={500} truncate style={NAME_STYLE}>
                    {field.name}
                </Text>
                <Badge size={"xs"} radius={"sm"} style={KEEP_WHOLE}>
                    {field.type}
                </Badge>
                {field.nullCount && field.nullCount > 0 ? (
                    <Text size={"xs"} color={"dimmed"} style={KEEP_WHOLE}>
                        {field.nullCount} null
                    </Text>
                ) : null}
            </Group>
            {renderSummary(field)}
        </Stack>
    )
}
