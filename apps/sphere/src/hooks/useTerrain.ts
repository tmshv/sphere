import type { Map as MapLibreMap, TerrainSpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

function isSameTerrain(a: TerrainSpecification | null, b: TerrainSpecification | null): boolean {
    return a?.source === b?.source && a?.exaggeration === b?.exaggeration
}

/**
 * Whether `setTerrain` can run: it throws unless the style has finished loading. `map.remove()` deletes the style
 * (leaving the terrain set), and `setStyle` swaps in a style that is not loaded yet. `isStyleLoaded()` would not
 * do: it is also false while any tile is loading. `_loaded` is the flag `setTerrain` itself checks.
 */
function canSetTerrain(map: MapLibreMap): boolean {
    return map.style?._loaded === true
}

/**
 * Keeps the map terrain equal to `options`. MapLibre throws when the terrain names a source that is not on
 * the map, and a <Source> is added only once the style has loaded, so the terrain is set once its source is
 * there (rechecked on every `sourcedata`) and cleared while it is missing. Nothing is touched while the style
 * is missing or loading: a new style resets the terrain itself, and its sources' `sourcedata` resyncs it.
 */
export default function useTerrain(ref: MapRef | undefined, options: TerrainSpecification | null) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const sync = () => {
            if (!canSetTerrain(map)) {
                return
            }
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

    // Cleared only when the map ref goes away, not on every options change: `sync` moves the terrain itself. On a
    // source switch it goes through null and on to the new source within one commit, before the next frame paints.
    // On teardown the Map's own cleanup has usually removed the style already, so nothing is cleared then
    useEffect(() => {
        const map = ref?.getMap()
        return () => {
            if (map && canSetTerrain(map) && map.getTerrain()) {
                map.setTerrain(null)
            }
        }
    }, [ref])
}
