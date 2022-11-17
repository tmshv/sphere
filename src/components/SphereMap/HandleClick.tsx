import { useMap } from "react-map-gl";
import { useEffect } from "react";
import mapboxgl, { Point } from "mapbox-gl";

export function queryFeaturesInPoint(map: mapboxgl.Map, point: Point, layers: string[]) {
    const size = 8
    const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
        [point.x - size / 2, point.y - size / 2],
        [point.x + size / 2, point.y + size / 2],
    ]
    const features = map.queryRenderedFeatures(bbox, {
        // layers,
    })

    if (features.length === 0) {
        return []
    }

    return features
}

export type HandleClickProps = {
    mapId: string
}

export const HandleClick: React.FC<HandleClickProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const handler = (event: mapboxgl.MapMouseEvent) => {
            console.log("map click", event)

            const features = queryFeaturesInPoint(event.target, event.point, [])
            for (const f of features) {
                console.log(f.id, f.properties, f.layer.id)
            }
        }

        map.on('click', handler)

        return () => {
            map.off('click', handler)
        }
    }, [ref, mapId])

    return null
}
