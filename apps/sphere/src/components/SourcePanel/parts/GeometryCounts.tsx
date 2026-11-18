import type { SourceMetadata } from "@/types"
import { PropertyList, type PropertyListItem } from "@sphere/ui"

export type GeometryCountsProps = {
    meta: SourceMetadata
}

function bucketValue(total: number, multi: number) {
    return multi > 0 ? `${total} (${multi} multi)` : `${total}`
}

/** The feature count, then a row per geometry kind the source has. */
export function geometryItems(meta: SourceMetadata): PropertyListItem[] {
    const rows: Array<[string, number, string | number]> = [
        ["Points", meta.pointsCount, bucketValue(meta.pointsCount, meta.multiPointsCount)],
        ["Lines", meta.linesCount, bucketValue(meta.linesCount, meta.multiLinesCount)],
        ["Polygons", meta.polygonsCount, bucketValue(meta.polygonsCount, meta.multiPolygonsCount)],
        ["Collections", meta.collectionsCount, meta.collectionsCount],
        ["No geometry", meta.nullGeometryCount, meta.nullGeometryCount],
    ]
    return [
        { name: "Features", value: meta.featuresCount },
        ...rows.flatMap(([name, count, value]) => (count > 0 ? [{ name, value }] : [])),
    ]
}

export function GeometryCounts({ meta }: GeometryCountsProps) {
    return <PropertyList items={geometryItems(meta)} />
}
