import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { Stack, Text } from "@sphere/ui"
import { PanelSection } from "./parts/PanelSection"
import { VectorLayerSection } from "./VectorLayerSection"

export function SourceLayerPanel() {
    const source = useAppSelector(selectors.source.selectCurrentSourceItem)
    const sourceLayer = useAppSelector(selectors.source.selectSelectedSourceLayer)

    if (!source || source.type !== SourceType.MVT) {
        return null
    }
    const layer = source.tilejson.vector_layers?.find(item => item.id === sourceLayer)

    return (
        <Stack gap={"md"}>
            <PanelSection title={"Layer"}>
                {layer ? <VectorLayerSection layer={layer} /> : <Text tone={"dimmed"}>No metadata for this layer</Text>}
            </PanelSection>
        </Stack>
    )
}
