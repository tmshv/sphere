import logger from "@/logger"
import { invoke } from "@tauri-apps/api"

export class ShapeReader {
    constructor(public path: string) {
    }

    public async getGeojson(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("shape_get_geojson", {
                path: this.path,
            })
            logger.info(`Got shape geojson ${res.length} bytes`)
            return JSON.parse(res)
        } catch (error) {
            logger.error("Failed to read shape as geojson", error)
            return null
        }
    }
}

