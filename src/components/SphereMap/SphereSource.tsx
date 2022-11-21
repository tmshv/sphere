import { featureCollection, lineString, multiLineString, multiPoint, multiPolygon, point, polygon } from "@turf/turf";
import { memo } from "react";
import { Source } from "react-map-gl";
import { useAppSelector } from "@/store/hooks";

export type SphereSourceProps = {
    id: string
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const data = useAppSelector(state => {
        const data = state.source.items[id].dataset.data

        const features = data.map(row => {
            let f: GeoJSON.Feature = null!
            const props = {
                ...row.data,
                id: row.id,
            }
            const geom = row.geometry!
            if (geom.type === "Point") {
                f = point((geom as GeoJSON.Point).coordinates, props) as GeoJSON.Feature
            }
            if (geom.type === "MultiPoint") {
                f = multiPoint((geom as GeoJSON.MultiPoint).coordinates, props) as GeoJSON.Feature
            }
            if (geom.type === "MultiLineString") {
                f = multiLineString((geom as GeoJSON.MultiLineString).coordinates, props)
            }
            if (geom.type === "LineString") {
                f = lineString((geom as GeoJSON.LineString).coordinates, props) as GeoJSON.Feature
            }
            if (geom.type === "MultiPolygon") {
                f = multiPolygon((geom as GeoJSON.MultiPolygon).coordinates, props)
            }
            if (geom.type === "Polygon") {
                f = polygon((geom as GeoJSON.Polygon).coordinates, props) as GeoJSON.Feature
            }
            f.id = row.id
            return f
        })
        return featureCollection(features)
    })
    if (!data) {
        return null
    }

    return (
        <Source
            id={id}
            type={"geojson"}
            data={data}
        >
        </Source>
    );
})

SphereSource.displayName = "SphereSource"
