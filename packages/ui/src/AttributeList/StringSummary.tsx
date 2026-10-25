import { Stack } from "../Layout"
import { Text } from "../Text"
import type { FieldSummary } from "."
import { InfoRow } from "../InfoRow"

export type StringSummaryProps = {
    summary: Extract<FieldSummary, { kind: "string" }>
}

export function StringSummary({ summary }: StringSummaryProps) {
    const remaining = summary.unique - summary.topValues.length
    return (
        <Stack gap="xxs">
            <Text tone="dimmed">{summary.unique} unique</Text>
            {summary.topValues.map(([value, count]) => (
                <InfoRow key={value} label={value} value={count} labelIsData />
            ))}
            {remaining > 0 ? <Text tone="dimmed">…{remaining} more</Text> : null}
        </Stack>
    )
}
