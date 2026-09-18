import { Button, SegmentedControl, Select, Stack, Text } from "@mantine/core"
import type { FC } from "react"
import { useState } from "react"
import {
    buildColumnOptions,
    canApplyCsvGeometry,
    missingAppliedColumns,
    type StagedCsvGeometry,
} from "@/lib/csv-geometry"
import type { CsvMode, FormatDetails } from "@/lib/source-reader"
import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import type { Id } from "@/types"

const MODE_OPTIONS = [
    { label: "X / Y", value: "xy" },
    { label: "WKT", value: "wkt" },
]

export type CsvGeometryConfigProps = {
    sourceId: Id
    details: Extract<FormatDetails, { format: "csv" }>
}

function isCsvMode(value: string): value is CsvMode {
    return value === "xy" || value === "wkt"
}

export const CsvGeometryConfig: FC<CsvGeometryConfigProps> = ({ sourceId, details }) => {
    const dispatch = useAppDispatch()
    const applied: StagedCsvGeometry = {
        mode: details.mode,
        wktColumn: details.wkt_column ?? undefined,
        xColumn: details.x_column ?? undefined,
        yColumn: details.y_column ?? undefined,
    }
    const [staged, setStaged] = useState<StagedCsvGeometry>(applied)

    const options = buildColumnOptions(details.header_columns, applied)
    const missing = missingAppliedColumns(details.header_columns, applied)

    return (
        <Stack spacing={"xs"}>
            <SegmentedControl
                size={"xs"}
                data={MODE_OPTIONS}
                value={staged.mode}
                onChange={value => {
                    if (isCsvMode(value)) {
                        setStaged({ ...staged, mode: value })
                    }
                }}
            />
            {staged.mode === "wkt" ? (
                <Select
                    size={"xs"}
                    label={"WKT column"}
                    data={options}
                    value={staged.wktColumn ?? null}
                    onChange={value => setStaged({ ...staged, wktColumn: value ?? undefined })}
                />
            ) : (
                <>
                    <Select
                        size={"xs"}
                        label={"X column"}
                        data={options}
                        value={staged.xColumn ?? null}
                        onChange={value => setStaged({ ...staged, xColumn: value ?? undefined })}
                    />
                    <Select
                        size={"xs"}
                        label={"Y column"}
                        data={options}
                        value={staged.yColumn ?? null}
                        onChange={value => setStaged({ ...staged, yColumn: value ?? undefined })}
                    />
                </>
            )}
            {missing.length === 0 ? null : (
                <Text size={"xs"} color={"orange"}>
                    Not in this file: {missing.join(", ")}
                </Text>
            )}
            <Button
                size={"xs"}
                disabled={!canApplyCsvGeometry(staged, applied)}
                onClick={() => {
                    dispatch(actions.sourceInfo.applyCsvGeometry({ id: sourceId, ...staged }))
                }}
            >
                Apply
            </Button>
        </Stack>
    )
}
