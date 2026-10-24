import type { SourceMetadata } from "@/types"
import { InfoRow, Stack } from "@sphere/ui"

export type GeometryCountsProps = {
    meta: SourceMetadata
}

function bucketValue(total: number, multi: number) {
    return multi > 0 ? `${total} (${multi} multi)` : `${total}`
}

export function GeometryCounts({ meta }: GeometryCountsProps) {
    return (
        <Stack gap={"xxs"}>
            <InfoRow label={"Features"} value={meta.featuresCount} />
            {meta.pointsCount > 0 ? (
                <InfoRow label={"Points"} value={bucketValue(meta.pointsCount, meta.multiPointsCount)} />
            ) : null}
            {meta.linesCount > 0 ? (
                <InfoRow label={"Lines"} value={bucketValue(meta.linesCount, meta.multiLinesCount)} />
            ) : null}
            {meta.polygonsCount > 0 ? (
                <InfoRow label={"Polygons"} value={bucketValue(meta.polygonsCount, meta.multiPolygonsCount)} />
            ) : null}
            {meta.collectionsCount > 0 ? <InfoRow label={"Collections"} value={meta.collectionsCount} /> : null}
            {meta.nullGeometryCount > 0 ? <InfoRow label={"No geometry"} value={meta.nullGeometryCount} /> : null}
        </Stack>
    )
}
