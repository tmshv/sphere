import { Badge, Group, Skeleton, Stack, Text } from "@mantine/core"
import type { FC, ReactNode } from "react"
import type { FieldEntry } from "@/store/sourceInfo/selectors"
import { NumericSummary } from "./NumericSummary"
import { StringSummary } from "./StringSummary"

const SKELETON_HEIGHT = 28

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
        default:
            return <Skeleton height={SKELETON_HEIGHT} />
    }
}

export const FieldRow: FC<FieldRowProps> = ({ field }) => {
    return (
        <Stack spacing={4}>
            <Group spacing={"xs"} noWrap>
                <Text size={"xs"} weight={500}>
                    {field.name}
                </Text>
                <Badge size={"xs"} radius={"sm"}>
                    {field.type}
                </Badge>
                {field.nullCount && field.nullCount > 0 ? (
                    <Text size={"xs"} color={"dimmed"}>
                        {field.nullCount} null
                    </Text>
                ) : null}
            </Group>
            {renderSummary(field)}
        </Stack>
    )
}
