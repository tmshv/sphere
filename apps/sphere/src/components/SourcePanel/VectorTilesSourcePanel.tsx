import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { Stack, Text } from "@sphere/ui"
import { VectorLayerSection } from "./VectorLayerSection"
import { PanelSection } from "./parts/PanelSection"
import { TileJsonSection } from "./parts/TileJsonSection"

export function VectorTilesSourcePanel() {
    const source = useAppSelector(selectors.source.selectCurrentSourceItem)

    if (!source || source.type !== SourceType.MVT) {
        return null
    }
    const layers = source.tilejson.vector_layers ?? []

    return (
        <Stack gap={"md"}>
            <TileJsonSection tilejson={source.tilejson} />
            <PanelSection title={"Layers"}>
                {layers.length === 0 ? (
                    <Text tone={"dimmed"}>No vector layers declared</Text>
                ) : (
                    <Stack gap={"sm"}>
                        {layers.map(layer => (
                            <VectorLayerSection key={layer.id} layer={layer} />
                        ))}
                    </Stack>
                )}
            </PanelSection>
        </Stack>
    )
}
