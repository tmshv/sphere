import { DRAW_ORIG_ID_KEY } from "@/const"
import { SourceReader } from "@/lib/source-reader"

/**
 * Loads features for draw mode. The backend returns selected features
 * if any are selected, or all features otherwise. Stamps each feature's
 * original ID into properties so the change tracker can map back.
 */
export async function loadDrawFeatures(sourceId: string): Promise<GeoJSON.FeatureCollection | null> {
    const reader = new SourceReader(sourceId)
    const fc = await reader.getSelected()
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
