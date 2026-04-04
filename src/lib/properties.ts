import type { PropertiesEntry } from "@/store/properties"

export function toPropertiesEntries(features: GeoJSON.Feature[]): PropertiesEntry[] {
    return features.reduce<PropertiesEntry[]>((acc, f) => {
        if (f.id != null) {
            acc.push({ id: f.id, values: f.properties ?? {} })
        }
        return acc
    }, [])
}
