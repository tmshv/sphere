import type { TerrainSpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

function isSameTerrain(a: TerrainSpecification | null, b: TerrainSpecification | null): boolean {
    return a?.source === b?.source && a?.exaggeration === b?.exaggeration
}

/**
 * Keeps the map terrain equal to `options`. MapLibre throws when the terrain names a source that is not on
 * the map, and a <Source> is added only once the style has loaded, so the terrain is set once its source is
 * there (rechecked on every `sourcedata`) and cleared while it is missing.
 */
export default function useTerrain(ref: MapRef | undefined, options: TerrainSpecification | null) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const sync = () => {
            const wanted = options && map.getSource(options.source) ? options : null
            if (!isSameTerrain(map.getTerrain(), wanted)) {
                map.setTerrain(wanted)
            }
        }

        sync()
        const subscription = map.on("sourcedata", sync)
        return () => {
            subscription.unsubscribe()
        }
    }, [ref, options])

    // Cleared only when the map goes away: between two terrains `sync` swaps them without a flat frame
    useEffect(() => {
        const map = ref?.getMap()
        return () => {
            if (map?.getTerrain()) {
                map.setTerrain(null)
            }
        }
    }, [ref])
}
