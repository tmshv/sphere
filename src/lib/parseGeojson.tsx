import { Dataset, FileParser, LineStringDataset, PointDataset, PolygonDataset, SourceType } from "@/types"
import { nextId, nextNumber } from "./nextId"

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

function isFeatureCollection(json: any): boolean {
    return true
}

export const parseGeojson: FileParser<SourceType.Geojson> = async raw => {
// export async function parseGeojson(name: string, location: string, raw: string): Promise<Dataset[] | null> {
    try {
        const parsed = JSON.parse(raw)
        if (!isFeatureCollection(parsed)) {
            throw new Error("Fail is not a GeoJSON")
        }
        // const points: PointDataset = {
        //     id: nextId("dataset"),
        //     name,
        //     location,
        //     type: SourceType.Points,
        //     data: [],
        // }
        // const lines: LineStringDataset = {
        //     id: nextId("dataset"),
        //     name,
        //     location,
        //     type: SourceType.Lines,
        //     data: [],
        // }
        // const polygons: PolygonDataset = {
        //     id: nextId("dataset"),
        //     name,
        //     location,
        //     type: SourceType.Polygons,
        //     data: [],
        // }

        const features = (parsed as GeoJSON.FeatureCollection).features
        const geojson: Dataset<SourceType.Geojson> = {
            id: nextId("dataset"),
            // name,
            // location,
            type: SourceType.Geojson,
            data: [],
        }
        let pointsCount = 0
        let linesCount = 0
        let polygonsCount = 0
        for (const feature of features) {
            const id = nextNumber()
            geojson.data.push({
                id,
                geometry: feature.geometry as any,
                data: feature.properties ?? {},
                meta: {
                },
            })

            if (pointType.has(feature.geometry.type)) {
                pointsCount ++
            }
            if (lineType.has(feature.geometry.type)) {
                linesCount ++
            }
            if (polygonType.has(feature.geometry.type)) {
                polygonsCount ++
            }
        }

        // const result: Dataset[] = []
        // if (points.data.length > 0) {
        //     result.push(points)
        // }
        // if (lines.data.length > 0) {
        //     result.push(lines)
        // }
        // if (polygons.data.length > 0) {
        //     result.push(polygons)
        // }
        // return result
        return [geojson, {
            pointsCount,
            linesCount,
            polygonsCount,
        }]
    } catch (error) {
        return new Error("Failed to read GeoJSON file")
    }
}
