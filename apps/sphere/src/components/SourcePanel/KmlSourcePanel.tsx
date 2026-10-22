import { Stack, Text } from "@mantine/core"
import type { FC } from "react"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { AttributeList, InfoRow } from "@sphere/ui"
import { FileSection } from "./parts/FileSection"
import { GeometryCounts } from "./parts/GeometryCounts"
import { PanelSection } from "./parts/PanelSection"

function skippedNote(count: number): string {
    if (count === 1) {
        return "1 placemark has no supported geometry and is not shown on the map."
    }
    return `${count} placemarks have no supported geometry and are not shown on the map.`
}

export const KmlSourcePanel: FC = () => {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const details = info?.details

    if (details?.format !== "kml") {
        return null
    }

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"KML contents"}>
                <InfoRow label={"Placemarks"} value={details.placemarks} />
                <InfoRow label={"Folders"} value={details.folders} />
                <InfoRow label={"Skipped placemarks"} value={details.skipped_placemarks} />
                {details.skipped_placemarks > 0 ? (
                    <Text size={"xs"} color={"orange"}>
                        {skippedNote(details.skipped_placemarks)}
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
