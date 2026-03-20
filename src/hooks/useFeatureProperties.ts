import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { useEffect } from "react"
import type { MapGeoJSONFeature, MapRef } from "react-map-gl/maplibre"
import useFeatureClick from "./useFeatureClick"

export default function useFeatureProperties(
    ref: MapRef | undefined,
    layerIds: string | string[] | undefined,
    delay: number,
) {
    const dispatch = useAppDispatch()
    const features = useFeatureClick(ref, layerIds, delay)

    useEffect(() => {
        if (features) {
            dispatch(actions.properties.set({ values: features.map(f => f.properties ?? {}) }))
        } else {
            dispatch(actions.properties.reset())
        }

        const map = ref?.getMap()
        if (!map || !layerIds) {
            return
        }

        const ids = Array.isArray(layerIds) ? layerIds : [layerIds]
        const handlers = ids.flatMap(id => [
            map.on("mousemove", id, event => {
                if (features) {
                    return
                }
                if (!event.features || event.features.length === 0) {
                    dispatch(actions.properties.reset())
                    return
                }
                // Collect values from all hovered features, dropping duplicates
                const seen = new Set<MapGeoJSONFeature["id"]>()
                const deduped: MapGeoJSONFeature[] = []
                for (const f of event.features) {
                    if (f.id === undefined) {
                        deduped.push(f)
                    } else if (!seen.has(f.id)) {
                        seen.add(f.id)
                        deduped.push(f)
                    }
                }
                dispatch(actions.properties.set({ values: deduped.map(f => f.properties ?? {}) }))
            }),
            map.on("mouseout", id, () => {
                if (features) {
                    return
                }
                dispatch(actions.properties.reset())
            }),
        ])

        return () => {
            for (const h of handlers) {
                h.unsubscribe()
            }
        }
    }, [dispatch, ref, layerIds, features])
}
