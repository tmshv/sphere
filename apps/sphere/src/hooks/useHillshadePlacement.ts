import { HILLSHADE_LAYER_ID, hillshadePlacement } from "@/lib/terrain"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

/**
 * Keeps the hillshade layer directly above the topmost raster layer (see `hillshadePlacement`). Every layer
 * change emits `styledata`, so this follows whatever order the user sets; a move is made only when the
 * layer above the hillshade is not the wanted one, so it settles after one move.
 */
export default function useHillshadePlacement(ref: MapRef | undefined): void {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const place = () => {
            if (!map.getLayer(HILLSHADE_LAYER_ID)) {
                return
            }
            const ids = map.getLayersOrder()
            const order = ids.flatMap(id => {
                const layer = map.getLayer(id)
                return layer ? [{ id, type: layer.type }] : []
            })
            const beforeId = hillshadePlacement(order)
            const above = ids.slice(ids.indexOf(HILLSHADE_LAYER_ID) + 1).at(0)
            if (above !== beforeId) {
                map.moveLayer(HILLSHADE_LAYER_ID, beforeId)
            }
        }

        place()
        const subscription = map.on("styledata", place)
        return () => {
            subscription.unsubscribe()
        }
    }, [ref])
}
