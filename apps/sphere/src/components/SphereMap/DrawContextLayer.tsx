import { assertUnreachable } from "@/lib"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { PointLayer } from "./PointLayer"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"
import { SpherePolygonLayer } from "./SpherePolygonLayer"

/**
 * While drawing, the drawn source in the preview look, minus every feature loaded into
 * draw. Not interactive: no handlers, and its layer ids are in no list a hover, click or
 * rect-select hook reads. The layers are added while rendering, before the draw control
 * adds its own in an effect, so they stay under the drawing.
 */
export function DrawContextLayer() {
    const specs = useAppSelector(selectors.drawContext.layerSpecs)
    const filter = useAppSelector(selectors.drawContext.filter)
    const outline = useAppSelector(selectors.settings.selectPreviewOutline)

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
                                color={spec.color}
                                visible={true}
                                options={spec.options}
                                outline={outline}
                                filter={filter}
                            />
                        )
                    case "LineString":
                        return (
                            <SphereLineStringLayer
                                key={spec.layerId}
                                layerId={spec.layerId}
                                sourceId={spec.sourceId}
                                color={spec.color}
                                visible={true}
                                thick={spec.thick}
                                outline={outline}
                                filter={filter}
                            />
                        )
                    case "Polygon":
                        return (
                            <SpherePolygonLayer
                                key={spec.layerId}
                                layerId={spec.layerId}
                                sourceId={spec.sourceId}
                                color={spec.color}
                                visible={true}
                                outline={outline}
                                filter={filter}
                            />
                        )
                    default:
                        return assertUnreachable(spec)
                }
            })}
        </>
    )
}
