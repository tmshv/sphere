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
        if (isFeatureCollection(parsed)) {
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
                // const id = feature.id ?? nextId()
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

            return [points, lines, polygons]
        } else {
            return null
        }
    } catch (error) {
        return null
    }
}
