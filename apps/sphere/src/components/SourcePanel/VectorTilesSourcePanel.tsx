import { Stack, Text } from "@mantine/core"
import type { FC } from "react"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { InfoRow } from "@sphere/ui"
import { PanelSection } from "./parts/PanelSection"
import { TileJsonSection } from "./parts/TileJsonSection"

export const VectorTilesSourcePanel: FC = () => {
    const source = useAppSelector(selectors.source.selectCurrentSourceItem)

    if (!source || source.type !== SourceType.MVT) {
        return null
    }
    const layers = source.tilejson.vector_layers ?? []

    return (
        <Stack spacing={"md"}>
            <TileJsonSection tilejson={source.tilejson} />
            <PanelSection title={"Layers"}>
                {layers.length === 0 ? (
                    <Text size={"xs"} color={"dimmed"}>
                        No vector layers declared
                    </Text>
                ) : (
                    <Stack spacing={"sm"}>
                        {layers.map(layer => (
                            <Stack key={layer.id} spacing={2}>
                                <Text size={"xs"} weight={500}>
                                    {layer.id}
                                </Text>
                                {layer.description ? (
                                    <Text size={"xs"} color={"dimmed"}>
                                        {layer.description}
                                    </Text>
                                ) : null}
                                {Object.entries(layer.fields ?? {}).map(([name, fieldType]) => (
                                    <InfoRow key={name} label={name} value={String(fieldType)} />
                                ))}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </PanelSection>
        </Stack>
    )
}
