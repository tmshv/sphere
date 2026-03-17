import { EMPTY_GEOJSON } from "@/const"
import { SourceReader } from "@/lib/source-reader"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { memo, useEffect, useMemo, useState } from "react"
import { Source } from "react-map-gl/maplibre"

export type FilteredLayerSourceProps = {
    layerId: string
}

export const FilteredLayerSource: React.FC<FilteredLayerSourceProps> = memo(({ layerId }) => {
    const dispatch = useAppDispatch()
    const layer = useAppSelector(state => state.layer.items[layerId])
    const [data, setData] = useState<GeoJSON.FeatureCollection>(EMPTY_GEOJSON as GeoJSON.FeatureCollection)

    const sourceId = layer?.sourceId
    const expressionJson = useMemo(() => JSON.stringify(layer?.filter?.expression ?? null), [layer?.filter?.expression])

    useEffect(() => {
        if (!sourceId || expressionJson === "null") {
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
    }, [layerId, sourceId, expressionJson, dispatch])

    if (!layer?.filter) {
        return null
    }

    return <Source id={`layer-${layerId}`} type="geojson" data={data} />
})

FilteredLayerSource.displayName = "FilteredLayerSource"
