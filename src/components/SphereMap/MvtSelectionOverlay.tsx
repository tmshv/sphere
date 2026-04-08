import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { getMvtSelection, onMvtSelectionUpdate } from "@/lib/mvt-selection-store"
import { useEffect, useState } from "react"
import { Layer, Source } from "react-map-gl/maplibre"

const SOURCE_ID = "mvt-selection-overlay"
const POINT_LAYER_ID = "mvt-selection-overlay-point"
const LINE_LAYER_ID = "mvt-selection-overlay-line"
const FILL_LAYER_ID = "mvt-selection-overlay-fill"
const OUTLINE_LAYER_ID = "mvt-selection-overlay-outline"

export function MvtSelectionOverlay() {
    const [data, setData] = useState<GeoJSON.FeatureCollection>(getMvtSelection)

    useEffect(() => {
        return onMvtSelectionUpdate(setData)
    }, [])

    if (data.features.length === 0) {
        return null
    }

    return (
        <Source id={SOURCE_ID} type="geojson" data={data}>
            <Layer
                id={FILL_LAYER_ID}
                type="fill"
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                paint={{
                    "fill-color": FEATURE_HIGHLIGHT_COLOR,
                    "fill-opacity": 0.15,
                }}
            />
            <Layer
                id={OUTLINE_LAYER_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                paint={{
                    "line-color": FEATURE_HIGHLIGHT_COLOR,
                    "line-width": 2,
                }}
            />
            <Layer
                id={LINE_LAYER_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
                paint={{
                    "line-color": FEATURE_HIGHLIGHT_COLOR,
                    "line-width": 2,
                }}
            />
            <Layer
                id={POINT_LAYER_ID}
                type="circle"
                filter={["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]}
                paint={{
                    "circle-color": FEATURE_HIGHLIGHT_COLOR,
                    "circle-radius": 4,
                    "circle-stroke-color": "white",
                    "circle-stroke-width": 1,
                }}
            />
        </Source>
    )
}
