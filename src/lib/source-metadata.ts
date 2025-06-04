import { SourceMetadata } from "@/types"

export function createSourceMetadataFromFeatureCollection(fc: GeoJSON.FeatureCollection): SourceMetadata {
    let pointsCount = 0
    let linesCount = 0
    let polygonsCount = 0

    for (const f of fc["features"]) {
        switch (f["geometry"]["type"]) {
            case "Point":
                pointsCount += 1
                break
            case "MultiPoint":
                pointsCount += 1
                break
            case "LineString":
                linesCount += 1
                break
            case "MultiLineString":
                linesCount += 1
                break
            case "Polygon":
                polygonsCount += 1
                break
            case "MultiPolygon":
                polygonsCount += 1
                break
            default:
                break
        }
    }

    return {
        pointsCount,
        linesCount,
        polygonsCount,
    }
}
