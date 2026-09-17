import type { SourceFormat } from "@/types"

const SOURCE_FORMATS = new Set<string>(["geojson", "csv", "shapefile", "gpx"])

export const DEFAULT_SOURCE_FORMAT: SourceFormat = "geojson"

export function isSourceFormat(value: string): value is SourceFormat {
    return SOURCE_FORMATS.has(value)
}
