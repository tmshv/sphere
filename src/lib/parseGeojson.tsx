function isFeatureCollection(json: any): boolean {
    return true
}

export async function parseGeojson(raw: string): Promise<GeoJSON.FeatureCollection | null> {
    try {
        const gis = JSON.parse(raw)
        if (isFeatureCollection(gis)) {
            return gis
        } else {
            return null
        }
    } catch (error) {
        return null
    }
}
