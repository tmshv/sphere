import { Stack } from "@mantine/core"
import type { FC } from "react"
import type { SourceMetadata } from "@/types"
import { InfoRow } from "./InfoRow"

export type GeometryCountsProps = {
    meta: SourceMetadata
}

function bucketValue(total: number, multi: number) {
    return multi > 0 ? `${total} (${multi} multi)` : `${total}`
}

export const GeometryCounts: FC<GeometryCountsProps> = ({ meta }) => {
    return (
        <Stack spacing={2}>
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
