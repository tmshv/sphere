import { Stack, Text } from "@mantine/core"
import type { FC } from "react"
import type { FieldSummary } from "@/store/sourceInfo/selectors"
import { InfoRow } from "./InfoRow"

export type StringSummaryProps = {
    summary: Extract<FieldSummary, { kind: "string" }>
}

export const StringSummary: FC<StringSummaryProps> = ({ summary }) => {
    const remaining = summary.unique - summary.topValues.length
    return (
        <Stack spacing={2}>
            <Text size={"xs"} color={"dimmed"}>
                {summary.unique} unique
            </Text>
            {summary.topValues.map(([value, count]) => (
                <InfoRow key={value} label={value} value={count} />
            ))}
            {remaining > 0 ? (
                <Text size={"xs"} color={"dimmed"}>
                    …{remaining} more
                </Text>
            ) : null}
        </Stack>
    )
}
