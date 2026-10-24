import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { AttributeList, InfoRow, Stack, Text } from "@sphere/ui"
import { FileSection } from "./parts/FileSection"
import { GeometryCounts } from "./parts/GeometryCounts"
import { PanelSection } from "./parts/PanelSection"

export function GpxSourcePanel() {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const details = info?.details

    if (details?.format !== "gpx") {
        return null
    }

    const hasUnrenderedContent = details.waypoints > 0 || details.routes > 0

    return (
        <Stack gap={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"GPX contents"}>
                <InfoRow label={"Waypoints"} value={details.waypoints} />
                <InfoRow label={"Tracks"} value={details.tracks} />
                <InfoRow label={"Routes"} value={details.routes} />
                <InfoRow label={"Track points"} value={details.track_points} />
                {hasUnrenderedContent ? (
                    <Text tone={"warning"}>
                        GPX rendering only supports tracks — waypoints and routes are not drawn on the map.
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
