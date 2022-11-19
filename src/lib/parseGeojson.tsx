import { Dataset, LineStringDataset, PointDataset, PolygonDataset, SourceType } from "@/types"
import { nextId } from "./nextId"

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

function isFeatureCollection(json: any): boolean {
    return true
}

export async function parseGeojson(name: string, location: string, raw: string): Promise<Dataset[] | null> {
    try {
        const parsed = JSON.parse(raw)
        if (!isFeatureCollection(parsed)) {
            return null
        }
        const points: PointDataset = {
            id: nextId(),
            name,
            location,
            type: SourceType.Points,
            data: [],
        }
        const lines: LineStringDataset = {
            id: nextId(),
            name,
            location,
            type: SourceType.Lines,
            data: [],
        }
        const polygons: PolygonDataset = {
            id: nextId(),
            name,
            location,
            type: SourceType.Polygons,
            data: [],
        }

        const features = (parsed as GeoJSON.FeatureCollection).features
        for (const feature of features) {
            const id = nextId()
            if (pointType.has(feature.geometry.type)) {
                points.data.push({
                    id,
                    geometry: feature.geometry as any,
                    data: feature.properties ?? {},
                    meta: {
                    },
                })
            }
            if (lineType.has(feature.geometry.type)) {
                points.data.push({
                    id,
                    geometry: feature.geometry as any,
                    data: feature.properties ?? {},
                    meta: {
                    },
                })
            }
            if (polygonType.has(feature.geometry.type)) {
                points.data.push({
                    id,
                    geometry: feature.geometry as any,
                    data: feature.properties ?? {},
                    meta: {
                    },
                })
            }
        }

        const result: Dataset[] = []
        if (points.data.length > 0) {
            result.push(points)
        }
        if (lines.data.length > 0) {
            result.push(lines)
        }
        if (polygons.data.length > 0) {
            result.push(polygons)
        }
        return result
    } catch (error) {
        return null
    }
}
