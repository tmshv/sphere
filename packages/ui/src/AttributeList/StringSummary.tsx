import { Stack } from "../Layout"
import { PropertyList, type PropertyListItem } from "../PropertyList"
import { Text } from "../Text"
import type { FieldSummary } from "."

type StringFieldSummary = Extract<FieldSummary, { kind: "string" }>

export type StringSummaryProps = {
    summary: StringFieldSummary
}

/** The most frequent values, each with how often it occurs. */
export function topValueItems({ topValues }: StringFieldSummary): PropertyListItem[] {
    return topValues.map(([value, count]) => ({ name: value, value: count }))
}

export function StringSummary({ summary }: StringSummaryProps) {
    const remaining = summary.unique - summary.topValues.length
    return (
        <Stack gap="xxs">
            <Text tone="dimmed">{summary.unique} unique</Text>
            <PropertyList items={topValueItems(summary)} />
            {remaining > 0 ? <Text tone="dimmed">…{remaining} more</Text> : null}
        </Stack>
    )
}
