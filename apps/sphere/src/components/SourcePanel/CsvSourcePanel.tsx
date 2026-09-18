import { Stack, Text } from "@mantine/core"
import type { FC } from "react"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { CsvGeometryConfig } from "./CsvGeometryConfig"
import { AttributeList } from "./parts/AttributeList"
import { FileSection } from "./parts/FileSection"
import { GeometryCounts } from "./parts/GeometryCounts"
import { InfoRow } from "./parts/InfoRow"
import { PanelSection } from "./parts/PanelSection"

export const CsvSourcePanel: FC = () => {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const sourceId = useAppSelector(selectors.source.selectSelectedId)
    const details = info?.details

    if (!sourceId || details?.format !== "csv") {
        return null
    }

    const totalRows = details.parsed_rows + details.skipped_rows

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"Geometry source"}>
                <CsvGeometryConfig key={sourceId} sourceId={sourceId} details={details} />
            </PanelSection>

            <PanelSection title={"Parsing"}>
                <InfoRow label={"Rows with geometry"} value={details.parsed_rows} />
                <InfoRow label={"Rows skipped"} value={details.skipped_rows} />
                {details.skipped_rows > 0 ? (
                    <Text size={"xs"} color={"orange"}>
                        {details.parsed_rows} of {totalRows} rows had valid geometry
                    </Text>
                ) : null}
            </PanelSection>

            {meta ? (
                <PanelSection title={"Geometry"}>
                    <GeometryCounts meta={meta} />
                </PanelSection>
            ) : null}

            <PanelSection title={"Attributes"}>
                <AttributeList fields={fields} />
            </PanelSection>
        </Stack>
    )
}
