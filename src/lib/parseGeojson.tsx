import { FileParser } from "@/types"
import { nextNumber } from "./nextId"

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

function isFeatureCollection(json: any): boolean {
    return true
}

export const parseGeojson: FileParser = async raw => {
    try {
        const parsed = JSON.parse(raw)
        if (!isFeatureCollection(parsed)) {
            throw new Error("Fail is not a GeoJSON")
        }

        const geojson = (parsed as GeoJSON.FeatureCollection)
        let pointsCount = 0
        let linesCount = 0
        let polygonsCount = 0
        for (const feature of geojson.features) {
            feature.id = nextNumber()
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

        return [geojson, {
            pointsCount,
            linesCount,
            polygonsCount,
        }]
    } catch (error) {
        throw new Error("Failed to read GeoJSON file")
    }
}
