import useFeatureClick from "@/hooks/useFeatureClick"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectCurrentLayer } from "@/store/selection"
import { selectPreviewSourceId } from "@/store/selectors"
import { useEffect } from "react"
import type { MapGeoJSONFeature, MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const dispatch = useAppDispatch()
    const layerId = useAppSelector(selectCurrentLayer)
    const previewSourceId = useAppSelector(selectPreviewSourceId)
    const effectiveLayerId = previewSourceId ? undefined : layerId
    const features = useFeatureClick(ref, effectiveLayerId, delay)

    useEffect(() => {
        if (!features) {
            dispatch(actions.properties.reset())
            return
        }
        dispatch(
            actions.properties.set({
                values: features.map(f => f.properties ?? {}),
            }),
        )
    }, [dispatch, features])

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        if (!effectiveLayerId) {
            return
        }

        const enter = map.on("mousemove", effectiveLayerId, event => {
            if (features) {
                return
            }
            if (!event.features) {
                dispatch(actions.properties.reset())
                return
            }
            if (event.features.length === 0) {
                dispatch(actions.properties.reset())
                return
            }
            // Collect values from all selected features
            // Drop duplicates and undefined ids
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
            const values = deduped.map(f => f.properties ?? {})
            dispatch(
                actions.properties.set({
                    values,
                }),
            )
        })
        const leave = map.on("mouseout", effectiveLayerId, () => {
            if (features) {
                return
            }
            dispatch(actions.properties.reset())
        })

        return () => {
            enter.unsubscribe()
            leave.unsubscribe()
        }
    }, [dispatch, ref, effectiveLayerId, features])
}
