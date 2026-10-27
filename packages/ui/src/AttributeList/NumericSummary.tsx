import { Stack } from "../Layout"
import { BarChart } from "../PropertiesTable/BarChart"
import type { FieldSummary } from "."
import { InfoRow } from "../InfoRow"

const HISTOGRAM_WIDTH = 120
const HISTOGRAM_HEIGHT = 28
const HISTOGRAM_COLOR = "rgb(34, 139, 230)"

export type NumericSummaryProps = {
    summary: Extract<FieldSummary, { kind: "numeric" }>
}

export function NumericSummary({ summary }: NumericSummaryProps) {
    return (
        <Stack gap="xxs">
            <BarChart
                data={summary.histogram}
                width={HISTOGRAM_WIDTH}
                height={HISTOGRAM_HEIGHT}
                color={HISTOGRAM_COLOR}
            />
            {summary.min === undefined ? null : <InfoRow label={"min"} value={summary.min} />}
            {summary.max === undefined ? null : <InfoRow label={"max"} value={summary.max} />}
            {summary.mean === undefined ? null : <InfoRow label={"mean"} value={summary.mean} />}
        </Stack>
    )
}
