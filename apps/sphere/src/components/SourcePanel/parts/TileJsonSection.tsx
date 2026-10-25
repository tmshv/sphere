import type { TileJSON } from "@/types/tilejson"
import { InfoRow, Text } from "@sphere/ui"
import { PanelSection } from "./PanelSection"

const DEFAULT_MIN_ZOOM = 0
const DEFAULT_MAX_ZOOM = 22

export type TileJsonSectionProps = {
    tilejson: TileJSON | null
}

export function TileJsonSection({ tilejson }: TileJsonSectionProps) {
    if (!tilejson) {
        return (
            <PanelSection title={"Tiles"}>
                <Text tone={"dimmed"}>No tile metadata</Text>
            </PanelSection>
        )
    }
    const minzoom = tilejson.minzoom ?? DEFAULT_MIN_ZOOM
    const maxzoom = tilejson.maxzoom ?? DEFAULT_MAX_ZOOM

    return (
        <PanelSection title={"Tiles"}>
            {tilejson.format ? <InfoRow label={"Format"} value={tilejson.format} /> : null}
            <InfoRow label={"Zoom"} value={`${minzoom}–${maxzoom}`} />
            {tilejson.bounds ? <InfoRow label={"Bounds"} value={tilejson.bounds.join(", ")} /> : null}
            {tilejson.center ? <InfoRow label={"Center"} value={tilejson.center.join(", ")} /> : null}
            {tilejson.scheme ? <InfoRow label={"Scheme"} value={tilejson.scheme} /> : null}
            {tilejson.version ? <InfoRow label={"Version"} value={tilejson.version} /> : null}
            {tilejson.attribution ? <InfoRow label={"Attribution"} value={tilejson.attribution} /> : null}
            {tilejson.description ? <InfoRow label={"Description"} value={tilejson.description} /> : null}
        </PanelSection>
    )
}
