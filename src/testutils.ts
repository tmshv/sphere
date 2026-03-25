import { SourceType } from "@/types"

export function makeGeojsonSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.Geojson,
        location: `/path/to/${id}.geojson`,
        fractionIndex: 0,
        editable: false,
        pending: false,
        meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
        ...overrides,
    }
}
