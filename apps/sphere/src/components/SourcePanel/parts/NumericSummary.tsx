import { BarChart } from "@sphere/ui"
import { Stack } from "@mantine/core"
import type { FC } from "react"
import type { FieldSummary } from "@/store/sourceInfo/selectors"
import { InfoRow } from "./InfoRow"

const HISTOGRAM_WIDTH = 120
const HISTOGRAM_HEIGHT = 28
const HISTOGRAM_COLOR = "rgb(34, 139, 230)"

export type NumericSummaryProps = {
    summary: Extract<FieldSummary, { kind: "numeric" }>
}

export const NumericSummary: FC<NumericSummaryProps> = ({ summary }) => {
    return (
        <Stack spacing={2}>
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
