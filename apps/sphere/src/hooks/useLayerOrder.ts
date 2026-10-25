import { layerOrderMoves } from "@/lib/maplibre"
import { useLayoutEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

/**
 * Keeps `layerIds` (bottom to top) stacked in that order on the map. A `beforeId` prop only moves the
 * layer whose neighbour changed, so after a block of layers moves, the ones below it are left behind;
 * this restacks them whenever the wanted order changes. A layout effect runs before the map next
 * paints, so a wrong stack never shows for a frame.
 */
export default function useLayerOrder(ref: MapRef | undefined, layerIds: string[]): void {
    useLayoutEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }
        for (const { id, beforeId } of layerOrderMoves(map.getLayersOrder(), layerIds)) {
            map.moveLayer(id, beforeId)
        }
    }, [ref, layerIds])
}
