import { SourceType } from "@/types"

export function makeGeojsonSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.Geojson,
        location: `/path/to/${id}.geojson`,
        format: "geojson",
        fractionIndex: 0,
        editable: false,
        pending: false,
        meta: {
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 0,
        },
        ...overrides,
    }
}

export function makeCsvSource<T extends object>(id: string, overrides: T = {} as T) {
    return makeGeojsonSource(id, { format: "csv", location: `/path/to/${id}.csv`, ...overrides })
}

export function makeMvtSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.MVT,
        location: `/path/to/${id}.mbtiles`,
        fractionIndex: 0,
        editable: false as const,
        pending: false as const,
        format: "pbf" as const,
        tilejson: { vector_layers: [] },
        sourceLayers: [],
        ...overrides,
    }
}
