import { filteredLayerId } from "@/lib/layer-source"
import { nextId } from "@/lib/nextId"
import { SourceReader } from "@/lib/source-reader"
import type { RootState } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { type Id, SourceType } from "@/types"
import type { FilterSpecification } from "maplibre-gl"
import type * as maplibregl from "maplibre-gl"
import { useEffect, useState } from "react"

type UseFeaturesOptions = {
    layerId: Id
    sourceId: Id
    map?: maplibregl.Map
    filter?: FilterSpecification
}

/**
 * `sourceId` is a MapLibre source id, which for a filtered layer is the
 * side-source created by `FilteredLayerSource` and therefore absent from the
 * source slice. Resolve it back to the source entry it was derived from,
 * together with the layer filter that side-source represents.
 */
function selectResolvedSource(state: RootState, mapSourceId: Id) {
    const layerId = filteredLayerId(mapSourceId)
    if (layerId === null) {
        return { source: state.source.items[mapSourceId], filter: null }
    }
    const layer = state.layer.items[layerId]
    const sourceId = layer?.sourceId
    return {
        source: sourceId ? state.source.items[sourceId] : undefined,
        filter: layer?.filter?.expression ?? null,
    }
}

function selectIsTiled(state: RootState, mapSourceId: Id): boolean {
    return selectResolvedSource(state, mapSourceId).source?.type === SourceType.MVT
}

function selectReaderSourceId(state: RootState, mapSourceId: Id): Id | null {
    const { source } = selectResolvedSource(state, mapSourceId)
    return source?.type === SourceType.Geojson ? source.id : null
}

/** Serialized layer filter to apply when reading, or null to read everything. */
function selectReaderFilterJson(state: RootState, mapSourceId: Id): string | null {
    const { source, filter } = selectResolvedSource(state, mapSourceId)
    if (source?.type !== SourceType.Geojson || filter === null) {
        return null
    }
    return JSON.stringify(filter)
}

function useTileFeatures({ map, sourceId, layerId, filter }: UseFeaturesOptions): GeoJSON.Feature[] | null {
    const [features, setFeatures] = useState<GeoJSON.Feature[]>([])
    const ok = useAppSelector(state => selectIsTiled(state, sourceId))
    useEffect(() => {
        if (!ok || !map) {
            return
        }

        const upd = () => {
            const features = map.queryRenderedFeatures({
                layers: [layerId],
                filter,
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
    }, [ok, layerId, map, filter])

    return features.length > 0 ? features : null
}

export function useFeatures({ sourceId, layerId, map, filter }: UseFeaturesOptions): GeoJSON.Feature[] {
    const [features, setFeatures] = useState<GeoJSON.Feature[]>([])
    const sourceIdForReader = useAppSelector(state => selectReaderSourceId(state, sourceId))
    const filterJson = useAppSelector(state => selectReaderFilterJson(state, sourceId))

    useEffect(() => {
        if (!sourceIdForReader) {
            return
        }

        let mount = true
        const f = async () => {
            const reader = new SourceReader(sourceIdForReader)
            const data = filterJson === null ? await reader.getGeojson() : await reader.getFiltered(filterJson)
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
    }, [sourceIdForReader, filterJson])

    const tf = useTileFeatures({
        sourceId,
        layerId,
        map,
        filter,
    })

    return tf ?? features
}
