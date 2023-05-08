import { invoke } from "@tauri-apps/api"

export class ShapeReader {
    constructor(public path: string) {
    }

    public async getGeojson(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("shape_get_geojson", {
                path: this.path,
            })
            return JSON.parse(res)
        } catch (error) {
            return null
        }
    }
}

