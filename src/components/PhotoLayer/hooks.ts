import { useAppSelector } from "@/store/hooks"
import { Id, SourceType } from "@/types"
import { useEffect, useState } from "react"
import { SourceReader } from "@/lib/source-reader"
import * as maplibregl from "maplibre-gl"
import { nextId } from "@/lib/nextId"

type UseFeaturesOptions = {
    layerId: Id,
    sourceId: Id,
    map?: maplibregl.Map,
}

function useTileFeatures({ map, sourceId, layerId }: UseFeaturesOptions): GeoJSON.Feature[] | null {
    const [features, setFeatures] = useState<GeoJSON.Feature[]>([])
    const ok = useAppSelector(state => {
        const source = state.source.items[sourceId]
        switch (source.type) {
            case SourceType.MVT: {
                return true
            }
            default: {
                return false
            }
        }
    })
    useEffect(() => {
        if (!ok || !map) {
            return
        }

        // switch (source.type) {
        //     case SourceType.FeatureCollection: {
        //         return
        //         //     if (source.pending) {
        //         //         return []
        //         //     }
        //         //     return source.dataset.features
        //         //         .filter(f => {
        //         //             const { src, iconSrc } = getImage(f.properties!)
        //         //             return !!src && !!iconSrc
        //         //         })
        //     }
        // }

        const upd = () => {
            const features = map.queryRenderedFeatures({
                layers: [layerId],
            })
            for (const f of features) {
                if (!f.id) {
                    f.id = nextId("feature")
                }
            }
            setFeatures(features)
        }
        map.on("moveend", upd)

        // Wait for the map to become idle so the layer and its tiles
        // are fully rendered before querying (replaces arbitrary setTimeout).
        const onIdle = () => {
            map.off("idle", onIdle)
            upd()
        }
        map.on("idle", onIdle)

        return () => {
            map.off("idle", onIdle)
            map.off("moveend", upd)
        }
    }, [ok, sourceId, layerId, map])

    return features.length > 0
        ? features
        : null
}

export function useFeatures({ sourceId, layerId, map }: UseFeaturesOptions): GeoJSON.Feature[] {
    const [features, setFeatures] = useState<GeoJSON.Feature[]>([])
    const sourceIdForReader = useAppSelector(state => {
        const source = state.source.items[sourceId]
        switch (source.type) {
            case SourceType.Geojson: {
                return source.id
            }
            default: {
                return null
            }
        }
    })

    useEffect(() => {
        if (!sourceIdForReader) {
            return
        }

        let mount = true
        const f = async () => {
            const reader = new SourceReader(sourceIdForReader)
            const data = await reader.getGeojson()
            if (!data) {
                return
            }
            if (mount) {
                const features = data?.features
                for (const f of features) {
                    if (!f.id) {
                        f.id = nextId("feature")
                    }
                }
                setFeatures(features)
            }
        }
        f()
        return () => {
            mount = false
        }
    }, [sourceIdForReader])

    const tf = useTileFeatures({
        sourceId,
        layerId,
        map,
    })

    return tf ?? features
}
