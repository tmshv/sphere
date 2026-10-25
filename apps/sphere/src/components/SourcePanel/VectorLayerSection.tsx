import type { VectorLayer } from "@/types/tilejson"
import { InfoRow, Stack, Text } from "@sphere/ui"

export type VectorLayerSectionProps = {
    layer: VectorLayer
}

export function VectorLayerSection({ layer }: VectorLayerSectionProps) {
    return (
        <Stack gap={"xxs"}>
            <Text weight={"medium"}>{layer.id}</Text>
            {layer.description ? <Text tone={"dimmed"}>{layer.description}</Text> : null}
            {Object.entries(layer.fields ?? {}).map(([name, fieldType]) => (
                <InfoRow key={name} label={name} value={String(fieldType)} labelIsData />
            ))}
        </Stack>
    )
}
