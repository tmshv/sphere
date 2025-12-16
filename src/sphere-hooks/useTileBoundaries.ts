import { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store"

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
