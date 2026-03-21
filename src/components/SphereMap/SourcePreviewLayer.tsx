import useFeatureProperties from "@/hooks/useFeatureProperties"
import { tableu10 } from "@/lib/color-scheme"
import { useAppSelector } from "@/store/hooks"
import { selectPreviewLayerIds, selectPreviewSourceId } from "@/store/selectors"
import { SourceType } from "@/types"
import { Fragment } from "react"
import { useMap } from "react-map-gl/maplibre"
import { PointLayer } from "./PointLayer"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"
import { SpherePolygonLayer } from "./SpherePolygonLayer"

const PREVIEW_COLOR = tableu10[0]

export type SourcePreviewLayerProps = {
    mapId: string
    delay: number
}

export function SourcePreviewLayer({ mapId, delay }: SourcePreviewLayerProps) {
    const { [mapId]: map } = useMap()
    const sourceId = useAppSelector(selectPreviewSourceId)
    const source = useAppSelector(state => (sourceId ? (state.source.items[sourceId] ?? null) : null))
    const layerIds = useAppSelector(selectPreviewLayerIds)

    useFeatureProperties(map, layerIds, delay)

    if (!sourceId || !source) {
        return null
    }

    if (source.type === SourceType.Geojson || source.type === SourceType.FeatureCollection) {
        return (
            <>
                <PointLayer
                    layerId={`preview-${sourceId}-point`}
                    sourceId={sourceId}
                    color={PREVIEW_COLOR}
                    visible={true}
                />
                <SphereLineStringLayer
                    layerId={`preview-${sourceId}-line`}
                    sourceId={sourceId}
                    color={PREVIEW_COLOR}
                    visible={true}
                    thick={false}
                />
                <SpherePolygonLayer
                    layerId={`preview-${sourceId}-polygon`}
                    sourceId={sourceId}
                    color={PREVIEW_COLOR}
                    visible={true}
                />
            </>
        )
    }

    if (source.type === SourceType.MVT) {
        return (
            <>
                {source.sourceLayers.map(sl => (
                    <Fragment key={sl.id}>
                        <PointLayer
                            layerId={`preview-${sourceId}-${sl.id}-point`}
                            sourceId={sourceId}
                            sourceLayer={sl.id}
                            color={PREVIEW_COLOR}
                            visible={true}
                        />
                        <SphereLineStringLayer
                            layerId={`preview-${sourceId}-${sl.id}-line`}
                            sourceId={sourceId}
                            sourceLayer={sl.id}
                            color={PREVIEW_COLOR}
                            visible={true}
                            thick={false}
                        />
                        <SpherePolygonLayer
                            layerId={`preview-${sourceId}-${sl.id}-polygon`}
                            sourceId={sourceId}
                            sourceLayer={sl.id}
                            color={PREVIEW_COLOR}
                            visible={true}
                        />
                    </Fragment>
                ))}
            </>
        )
    }

    return null
}
