import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { InfoRow, Stack, Text } from "@sphere/ui"
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
                            <Stack key={layer.id} gap={"xxs"}>
                                <Text weight={"medium"}>{layer.id}</Text>
                                {layer.description ? <Text tone={"dimmed"}>{layer.description}</Text> : null}
                                {Object.entries(layer.fields ?? {}).map(([name, fieldType]) => (
                                    <InfoRow key={name} label={name} value={String(fieldType)} labelIsData />
                                ))}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </PanelSection>
        </Stack>
    )
}
