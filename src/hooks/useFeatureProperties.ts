import { actions } from "@/store"
import { useAppDispatch } from "@/store/hooks"
import type { PropertiesEntry } from "@/store/properties"
import { deduplicate } from "@/lib/array"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import useFeatureClick from "./useFeatureClick"

export default function useFeatureProperties(ref: MapRef | undefined, layerIds: string[], delay: number) {
    const dispatch = useAppDispatch()
    const features = useFeatureClick(ref, layerIds, delay)

    useEffect(() => {
        if (features) {
            dispatch(
                actions.properties.set({
                    entries: features.reduce<PropertiesEntry[]>((acc, f) => {
                        if (f.id != null) {
                            acc.push({ id: f.id, values: f.properties ?? {} })
                        }
                        return acc
                    }, []),
                }),
            )
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
            // Deduplicate: MVT feature IDs are only unique within a source layer,
            // so key by source + sourceLayer + id. GeoJSON features are guaranteed
            // to have numeric IDs assigned by the Rust backend.
            const deduped = deduplicate(hovered, f => `${f.source ?? ""}:${f.sourceLayer ?? ""}:${f.id}`)
            dispatch(
                actions.properties.set({
                    entries: deduped.reduce<PropertiesEntry[]>((acc, f) => {
                        if (f.id != null) {
                            acc.push({ id: f.id, values: f.properties ?? {} })
                        }
                        return acc
                    }, []),
                }),
            )
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
