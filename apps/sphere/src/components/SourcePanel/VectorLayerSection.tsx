import type { VectorLayer } from "@/types/tilejson"
import { PropertyList, Stack, Text } from "@sphere/ui"

export type VectorLayerSectionProps = {
    layer: VectorLayer
}

export function VectorLayerSection({ layer }: VectorLayerSectionProps) {
    return (
        <Stack gap={"xxs"}>
            <Text weight={"semibold"}>{layer.id}</Text>
            {layer.description ? <Text tone={"dimmed"}>{layer.description}</Text> : null}
            <PropertyList
                items={Object.entries(layer.fields ?? {}).map(([name, fieldType]) => ({
                    name,
                    value: String(fieldType),
                }))}
            />
        </Stack>
    )
}
