import { Stack } from "../Layout"
import { BarChart } from "../PropertiesTable/BarChart"
import { PropertyList, type PropertyListItem } from "../PropertyList"
import type { FieldSummary } from "."

const HISTOGRAM_WIDTH = 120
const HISTOGRAM_HEIGHT = 28
const HISTOGRAM_COLOR = "rgb(34, 139, 230)"

type NumericFieldSummary = Extract<FieldSummary, { kind: "numeric" }>

export type NumericSummaryProps = {
    summary: NumericFieldSummary
}

/** The min, max and mean the summary has, in that order. */
export function numericItems({ min, max, mean }: NumericFieldSummary): PropertyListItem[] {
    const stats: Array<[string, number | undefined]> = [
        ["min", min],
        ["max", max],
        ["mean", mean],
    ]
    return stats.flatMap(([name, value]) => (value === undefined ? [] : [{ name, value }]))
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
            <PropertyList items={numericItems(summary)} />
        </Stack>
    )
}
