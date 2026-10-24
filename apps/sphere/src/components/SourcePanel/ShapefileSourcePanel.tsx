import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { AttributeList, InfoRow, Stack, Text } from "@sphere/ui"
import { FileSection } from "./parts/FileSection"
import { GeometryCounts } from "./parts/GeometryCounts"
import { PanelSection } from "./parts/PanelSection"

const SIDECARS = [
    { extension: ".dbf", key: "has_dbf" },
    { extension: ".shx", key: "has_shx" },
    { extension: ".prj", key: "has_prj" },
    { extension: ".cpg", key: "has_cpg" },
] as const

export function ShapefileSourcePanel() {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)
    const details = info?.details

    if (details?.format !== "shapefile") {
        return null
    }

    return (
        <Stack gap={"md"}>
            <FileSection file={info?.file} />

            <PanelSection title={"Sidecars & CRS"}>
                {SIDECARS.map(sidecar => (
                    <InfoRow
                        key={sidecar.extension}
                        label={sidecar.extension}
                        value={details[sidecar.key] ? "present" : "missing"}
                    />
                ))}
                <InfoRow label={"CRS"} value={details.crs ?? "unknown"} />
                {details.has_dbf ? null : (
                    <Text tone={"warning"}>No .dbf sidecar — this shapefile has no attributes</Text>
                )}
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
