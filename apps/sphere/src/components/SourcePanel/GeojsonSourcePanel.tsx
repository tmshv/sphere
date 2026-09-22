import { Stack } from "@mantine/core"
import type { FC } from "react"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { AttributeList } from "@sphere/ui"
import { FileSection } from "./parts/FileSection"
import { GeometryCounts } from "./parts/GeometryCounts"
import { PanelSection } from "./parts/PanelSection"

export const GeojsonSourcePanel: FC = () => {
    const info = useAppSelector(selectors.sourceInfo.selectCurrentSourceInfo)
    const fields = useAppSelector(selectors.sourceInfo.selectCurrentSourceFields)
    const meta = useAppSelector(selectors.sourceInfo.selectCurrentSourceMeta)

    return (
        <Stack spacing={"md"}>
            <FileSection file={info?.file} />
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
