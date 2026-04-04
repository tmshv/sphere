import { DRAW_ORIG_ID_KEY } from "@/const"
import { SourceReader } from "@/lib/source-reader"

/**
 * Loads features for draw mode, stamping each feature's original ID
 * into properties so the change tracker can map back to source IDs.
 */
export async function loadDrawFeatures(
    sourceId: string,
    ids: number[],
): Promise<GeoJSON.FeatureCollection | null> {
    const reader = new SourceReader(sourceId)
    const fc = ids.length > 0 ? await reader.getByIds(ids) : await reader.getGeojson()
    if (!fc) return null

    for (const feature of fc.features) {
        if (feature.id !== undefined && feature.id !== null) {
            if (!feature.properties) {
                feature.properties = {}
            }
            feature.properties[DRAW_ORIG_ID_KEY] = feature.id
        }
    }

    return fc
}
