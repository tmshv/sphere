import type { DrawFeature } from "../feature_types/draw_feature"
import getGeoJSON, { type DrawableFixtureName, type GeoJSONFixtures } from "./get_geojson"

/**
 * A fixture feature with a random string id, plus the `toGeoJSON` and
 * `setProperty` members of a Draw feature. It is GeoJSON input for the
 * feature classes and a stand-in for a Draw feature in the store.
 */
export type FakeFeature<K extends DrawableFixtureName = DrawableFixtureName> = GeoJSONFixtures[K] & {
    id: string
    toGeoJSON(): FakeFeature<K>
    setProperty(property: string, value: unknown): void
}

export default function createFeature<K extends DrawableFixtureName>(featureType: K): FakeFeature<K> {
    const geojson = getGeoJSON(featureType)
    const feature: FakeFeature<K> = {
        ...geojson,
        id: crypto.randomUUID(),
        toGeoJSON: () => feature,
        setProperty(property, value) {
            feature.properties[property] = value
        },
    }
    return feature
}

/** The fake feature as the store holds it, to pass it to `Store#add` and the like. */
export function asDrawFeature(feature: FakeFeature): DrawFeature {
    // A fake has only the members the store touches, not a whole Draw feature class
    return feature as unknown as DrawFeature
}
