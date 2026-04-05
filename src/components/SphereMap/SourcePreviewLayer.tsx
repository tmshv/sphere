import useFeatureProperties from "@/hooks/useFeatureProperties"
import { assertUnreachable } from "@/lib"
import { selectors } from "@/store"
import { isHoverPopupEnabled } from "@/lib/map-tools"
import { selectMapTool } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import { Layer, useMap } from "react-map-gl/maplibre"
import { PointLayer } from "./PointLayer"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"
import { SpherePolygonLayer } from "./SpherePolygonLayer"

const EMPTY: string[] = []

export type SourcePreviewLayerProps = {
    mapId: string
    delay: number
}

export function SourcePreviewLayer({ mapId, delay }: SourcePreviewLayerProps) {
    const { [mapId]: map } = useMap()
    const specs = useAppSelector(selectors.preview.layerSpecs)
    const layerIds = useAppSelector(selectors.preview.layerIds)

    const mapTool = useAppSelector(selectMapTool)
    const effectiveLayerIds = isHoverPopupEnabled(mapTool) ? layerIds : EMPTY

    useFeatureProperties(map, effectiveLayerIds, delay)

    return (
        <>
            {specs.map(spec => {
                switch (spec.kind) {
                    case "Point":
                        return (
                            <PointLayer
                                key={spec.layerId}
                                layerId={spec.layerId}
                                sourceId={spec.sourceId}
                                sourceLayer={spec.sourceLayer}
                                color={spec.color}
                                visible={true}
                                options={spec.options}
                            />
                        )
                    case "LineString":
                        return (
                            <SphereLineStringLayer
                                key={spec.layerId}
                                layerId={spec.layerId}
                                sourceId={spec.sourceId}
                                sourceLayer={spec.sourceLayer}
                                color={spec.color}
                                visible={true}
                                thick={spec.thick}
                            />
                        )
                    case "Polygon":
                        return (
                            <SpherePolygonLayer
                                key={spec.layerId}
                                layerId={spec.layerId}
                                sourceId={spec.sourceId}
                                sourceLayer={spec.sourceLayer}
                                color={spec.color}
                                visible={true}
                            />
                        )
                    case "Raster":
                        return <Layer key={spec.layerId} id={spec.layerId} source={spec.sourceId} type="raster" />
                    default:
                        return assertUnreachable(spec)
                }
            })}
        </>
    )
}
