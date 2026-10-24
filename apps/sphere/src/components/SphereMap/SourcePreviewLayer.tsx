import useFeatureProperties from "@/hooks/useFeatureProperties"
import useLayerOrder from "@/hooks/useLayerOrder"
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
    // Mounted tree top first with `beforeId`, so a new layer lands in place; useLayerOrder restacks after a move
    const stack = useAppSelector(selectors.preview.layerStack)
    const drawOrder = useAppSelector(selectors.preview.drawOrder)
    const layerIds = useAppSelector(selectors.preview.layerIds)

    const mapTool = useAppSelector(selectMapTool)
    const effectiveLayerIds = isHoverPopupEnabled(mapTool) ? layerIds : EMPTY

    useFeatureProperties(map, effectiveLayerIds, delay)
    useLayerOrder(map, drawOrder)

    return (
        <>
            {stack.map(({ spec, beforeId }) => {
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
                                beforeId={beforeId}
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
                                beforeId={beforeId}
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
                                beforeId={beforeId}
                            />
                        )
                    case "Raster":
                        return (
                            <Layer
                                key={spec.layerId}
                                id={spec.layerId}
                                beforeId={beforeId}
                                source={spec.sourceId}
                                type="raster"
                            />
                        )
                    default:
                        return assertUnreachable(spec)
                }
            })}
        </>
    )
}
