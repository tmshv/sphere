import type { Projection } from "@/types"

export const WEB_MERCATOR_CRS = "EPSG:3857"

// The CRS the map cuts tiles in; a projection registered with `addProjection` would map to its own name
const PROJECTION_CRS: Record<Projection, string> = {
    mercator: WEB_MERCATOR_CRS,
    globe: WEB_MERCATOR_CRS,
}

export function projectionCrs(projection: Projection): string {
    return PROJECTION_CRS[projection]
}
