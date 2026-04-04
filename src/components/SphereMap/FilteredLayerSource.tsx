import { EMPTY_GEOJSON } from "@/const"
import { filteredSourceId } from "@/lib/layer-source"
import { isRasterTileFormat } from "@/lib/tilejson"
import { SourceReader } from "@/lib/source-reader"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { memo, useEffect, useMemo, useState } from "react"
import { Source } from "react-map-gl/maplibre"

export type FilteredLayerSourceProps = {
    layerId: string
}

export const FilteredLayerSource: React.FC<FilteredLayerSourceProps> = memo(({ layerId }) => {
    const dispatch = useAppDispatch()
    const layer = useAppSelector(state => state.layer.items[layerId])
    const source = useAppSelector(state => {
        const sid = state.layer.items[layerId]?.sourceId
        return sid ? state.source.items[sid] : undefined
    })
    const [data, setData] = useState<GeoJSON.FeatureCollection>(EMPTY_GEOJSON as GeoJSON.FeatureCollection)

    const sourceId = layer?.sourceId
    const isMaplibreFiltered = source?.type === SourceType.MVT && !source.pending && !isRasterTileFormat(source.format)
    const expressionJson = useMemo(() => JSON.stringify(layer?.filter?.expression ?? null), [layer?.filter?.expression])

    useEffect(() => {
        if (!sourceId || expressionJson === "null" || isMaplibreFiltered) {
            return
        }
        const reader = new SourceReader(sourceId)
        reader
            .getFiltered(expressionJson)
            .then(fc => {
                if (fc) {
                    setData(fc)
                } else {
                    dispatch(
                        actions.layer.setLayerFilterError({
                            id: layerId,
                            error: "Failed to apply filter",
                        }),
                    )
                }
            })
            .catch(err => {
                dispatch(
                    actions.layer.setLayerFilterError({
                        id: layerId,
                        error: String(err),
                    }),
                )
            })
    }, [layerId, sourceId, expressionJson, isMaplibreFiltered, dispatch])

    if (!layer?.filter || isMaplibreFiltered) {
        return null
    }

    return <Source id={filteredSourceId(layerId)} type="geojson" data={data} />
})

FilteredLayerSource.displayName = "FilteredLayerSource"
