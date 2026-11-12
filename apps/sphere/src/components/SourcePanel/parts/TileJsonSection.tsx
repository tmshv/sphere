import type { TileJSON } from "@/types/tilejson"
import { PropertyList, type PropertyListItem, Text } from "@sphere/ui"
import { PanelSection } from "./PanelSection"

const DEFAULT_MIN_ZOOM = 0
const DEFAULT_MAX_ZOOM = 22

export type TileJsonSectionProps = {
    tilejson: TileJSON | null
}

function present(rows: ReadonlyArray<[string, string | null | undefined]>): PropertyListItem[] {
    return rows.flatMap(([name, value]) => (value ? [{ name, value }] : []))
}

/** The format and zoom range, then each other piece of tile metadata the TileJSON has. */
export function tileJsonItems(tilejson: TileJSON): PropertyListItem[] {
    const minzoom = tilejson.minzoom ?? DEFAULT_MIN_ZOOM
    const maxzoom = tilejson.maxzoom ?? DEFAULT_MAX_ZOOM
    return [
        ...present([["Format", tilejson.format]]),
        { name: "Zoom", value: `${minzoom}–${maxzoom}` },
        ...present([
            ["Bounds", tilejson.bounds?.join(", ")],
            ["Center", tilejson.center?.join(", ")],
            ["Scheme", tilejson.scheme],
            ["Version", tilejson.version],
            ["Attribution", tilejson.attribution],
            ["Description", tilejson.description],
        ]),
    ]
}

export function TileJsonSection({ tilejson }: TileJsonSectionProps) {
    if (!tilejson) {
        return (
            <PanelSection title={"Tiles"}>
                <Text tone={"dimmed"}>No tile metadata</Text>
            </PanelSection>
        )
    }
    return (
        <PanelSection title={"Tiles"}>
            <PropertyList items={tileJsonItems(tilejson)} />
        </PanelSection>
    )
}
