function isFeatureCollection(json: any): boolean {
    return true
}

export async function parseGeojson(raw: string): Promise<GeoJSON.FeatureCollection | null> {
    try {
        const parsed = JSON.parse(raw)
        if (isFeatureCollection(parsed)) {
            return parsed
        } else {
            return null
        }
    } catch (error) {
        return null
    }
}
