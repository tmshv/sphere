import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useTileBoundaries(ref: MapRef | undefined) {
    const val = useAppSelector(selectors.tileBoundaries.show)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }
        const origin = map.showTileBoundaries
        map.showTileBoundaries = val
        return () => {
            map.showTileBoundaries = origin
        }
    }, [ref, val])

    return null
}
