import { memo, useEffect, useState } from "react"
import { Source } from "react-map-gl/maplibre"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceReader } from "@/lib/source-reader"
import { actions } from "@/store"
import { EMPTY_GEOJSON } from "@/const"

export type FilteredLayerSourceProps = {
    layerId: string
}

export const FilteredLayerSource: React.FC<FilteredLayerSourceProps> = memo(({ layerId }) => {
    const dispatch = useAppDispatch()
    const layer = useAppSelector(state => state.layer.items[layerId])
    const [data, setData] = useState<GeoJSON.FeatureCollection>(EMPTY_GEOJSON as GeoJSON.FeatureCollection)

    const sourceId = layer?.sourceId
    const expression = layer?.filter?.expression ?? null

    useEffect(() => {
        if (!sourceId || !expression) {
            return
        }
        const filterJson = JSON.stringify(expression)
        const reader = new SourceReader(sourceId)
        reader.getFiltered(filterJson).then(fc => {
            if (fc) {
                setData(fc)
            } else {
                dispatch(actions.layer.setLayerFilterError({
                    id: layerId,
                    error: "Failed to apply filter",
                }))
            }
        }).catch(err => {
            dispatch(actions.layer.setLayerFilterError({
                id: layerId,
                error: String(err),
            }))
        })
    }, [layerId, sourceId, JSON.stringify(expression)])

    if (!layer?.filter) {
        return null
    }

    return <Source id={`layer-${layerId}`} type="geojson" data={data} />
})

FilteredLayerSource.displayName = "FilteredLayerSource"
