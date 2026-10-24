import { Stack, Text } from "@mantine/core"
import type { VectorLayer } from "@/types/tilejson"
import { InfoRow } from "@sphere/ui"

export type VectorLayerSectionProps = {
    layer: VectorLayer
}

export function VectorLayerSection({ layer }: VectorLayerSectionProps) {
    return (
        <Stack spacing={2}>
            <Text size={"xs"} weight={500}>
                {layer.id}
            </Text>
            {layer.description ? (
                <Text size={"xs"} color={"dimmed"}>
                    {layer.description}
                </Text>
            ) : null}
            {Object.entries(layer.fields ?? {}).map(([name, fieldType]) => (
                <InfoRow key={name} label={name} value={String(fieldType)} labelIsData />
            ))}
        </Stack>
    )
}
