import { assertUnreachable } from "@/lib";
import { SourceType } from "@/types";
import { featureCollection, lineString, multiLineString, multiPoint, multiPolygon, point, polygon } from "@turf/turf";
import { ReactNode } from "react";
import { Source } from "react-map-gl";
import { useAppSelector } from "@/store/hooks";

export type SphereSourceProps = {
    id: string
    children?: ReactNode
}

export const SphereSource: React.FC<SphereSourceProps> = ({ id, children }) => {
    const data = useAppSelector(state => {
        const { type, data } = state.source.items[id]

        switch (type) {
            case SourceType.Points: {
                const features = data.map(row => {
                    const geom = row.geometry!
                    if (Array.isArray(geom)) {
                        return multiPoint((geom as GeoJSON.MultiPoint).coordinates, row.data) as GeoJSON.Feature
                    }
                    return point((geom as GeoJSON.Point).coordinates, row.data) as GeoJSON.Feature
                })
                return featureCollection(features)
            }
            case SourceType.Lines: {
                const features = data.map(row => {
                    const geom = row.geometry!
                    if (Array.isArray(geom)) {
                        return multiLineString((geom as GeoJSON.MultiLineString).coordinates, row.data)
                    }
                    return lineString((geom as GeoJSON.LineString).coordinates, row.data) as GeoJSON.Feature
                })
                return featureCollection(features)
            }
            case SourceType.Polygons: {
                const features = data.map(row => {
                    const geom = row.geometry!
                    if (Array.isArray(geom)) {
                        return multiPolygon((geom as GeoJSON.MultiPolygon).coordinates, row.data)
                    }
                    return polygon((geom as GeoJSON.Polygon).coordinates, row.data) as GeoJSON.Feature
                })
                return featureCollection(features)
            }
            default: {
                assertUnreachable(type)
            }
        }
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
            {children}
        </Source>
    );
}
