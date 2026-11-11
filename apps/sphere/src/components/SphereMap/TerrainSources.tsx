import { HILLSHADE_LAYER_ID, demSourceProps, hillshadeDemSourceId, terrainDemSourceId } from "@/lib/terrain"
import { useAppSelector } from "@/store/hooks"
import { selectIsShowHillshade, selectIsShowTerrain, selectTerrainSource } from "@/store/terrain"
import { Layer, Source } from "react-map-gl/maplibre"

// The raster-dem sources of the current terrain source: one for the terrain, a separate one for the
// hillshade (MapLibre renders both better from their own sources). Each is keyed by its id, so switching
// the terrain source remounts them rather than reusing a <Source> for another id.
export function TerrainSources() {
    const candidate = useAppSelector(selectTerrainSource)
    const source = useAppSelector(state => (candidate ? state.source.items[candidate.id] : undefined))
    const showTerrain = useAppSelector(selectIsShowTerrain)
    const showHillshade = useAppSelector(selectIsShowHillshade)

    if (!candidate || !source) {
        return null
    }
    const props = demSourceProps(source, candidate.encoding)
    if (!props) {
        return null
    }

    const terrainId = terrainDemSourceId(candidate.id)
    const hillshadeId = hillshadeDemSourceId(candidate.id)
    return (
        <>
            {showTerrain && <Source key={terrainId} id={terrainId} {...props} />}
            {showHillshade && (
                <Source key={hillshadeId} id={hillshadeId} {...props}>
                    <Layer id={HILLSHADE_LAYER_ID} type="hillshade" />
                </Source>
            )}
        </>
    )
}
