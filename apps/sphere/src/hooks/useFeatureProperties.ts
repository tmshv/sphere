import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { toPropertiesEntries } from "@/lib/properties"
import { deduplicate } from "@sphere/utils"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, layerIds: string[], _delay: number) {
    const dispatch = useAppDispatch()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || layerIds.length === 0) {
            dispatch(actions.properties.resetHover())
            return
        }

        const handleMove = map.on("mousemove", event => {
            const hovered = map.queryRenderedFeatures(event.point, { layers: layerIds })
            if (!hovered || hovered.length === 0) {
                dispatch(actions.properties.resetHover())
                return
            }
            const deduped = deduplicate(hovered, f => `${f.source ?? ""}:${f.sourceLayer ?? ""}:${f.id}`)
            dispatch(actions.properties.setHover({ entries: toPropertiesEntries(deduped) }))
        })

        const handleOut = map.on("mouseout", () => {
            dispatch(actions.properties.resetHover())
        })

        return () => {
            handleMove.unsubscribe()
            handleOut.unsubscribe()
        }
    }, [dispatch, ref, layerIds])
}
