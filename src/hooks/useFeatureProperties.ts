import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import { useEffect } from "react"
import type { MapGeoJSONFeature, MapRef } from "react-map-gl/maplibre"
import useFeatureClick from "./useFeatureClick"

export default function useFeatureProperties(ref: MapRef | undefined, layerIds: string[], delay: number) {
    const dispatch = useAppDispatch()
    const features = useFeatureClick(ref, layerIds, delay)

    useEffect(() => {
        if (features) {
            dispatch(actions.properties.set({ values: features.map(f => f.properties ?? {}) }))
        } else {
            dispatch(actions.properties.reset())
        }

        const map = ref?.getMap()
        if (!map || layerIds.length === 0) {
            return
        }

        // Use a single map-level mousemove that queries all layerIds at once.
        // Per-layer listeners would race: mouseout from the old layer can fire after
        // mousemove from the new layer when moving between overlapping sublayers
        // (e.g. polygon fill → polygon outline), causing the popup to flash away.
        const handleMove = map.on("mousemove", event => {
            if (features) {
                return
            }
            const hovered = map.queryRenderedFeatures(event.point, { layers: layerIds })
            if (!hovered || hovered.length === 0) {
                dispatch(actions.properties.reset())
                return
            }
            // Collect values from all hovered features, dropping duplicates.
            // Key includes sourceLayer because MVT feature IDs are only unique within
            // a source layer — two features from different source layers can share the same id.
            // For features without an id (GeoJSON without explicit ids), deduplicate by
            // properties content so the same feature rendered on multiple sublayers
            // (e.g. polygon fill + outline) appears only once.
            const seen = new Set<string>()
            const deduped: MapGeoJSONFeature[] = []
            for (const f of hovered) {
                const featureKey = f.id !== undefined
                    ? `${f.id}`
                    : `${JSON.stringify(f.properties ?? {})}:${JSON.stringify(f.geometry)}`
                const key = `${f.source ?? ""}:${f.sourceLayer ?? ""}:${featureKey}`
                if (!seen.has(key)) {
                    seen.add(key)
                    deduped.push(f)
                }
            }
            dispatch(actions.properties.set({ values: deduped.map(f => f.properties ?? {}) }))
        })

        const handleOut = map.on("mouseout", () => {
            if (features) {
                return
            }
            dispatch(actions.properties.reset())
        })

        return () => {
            handleMove.unsubscribe()
            handleOut.unsubscribe()
        }
    }, [dispatch, ref, layerIds, features])
}
