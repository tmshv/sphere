import logger from "@/logger"
import { invoke } from "@tauri-apps/api"

export class SourceReader {
    constructor(public location: string) {
    }

    private getId(): string {
        const url = new URL(this.location)
        return url.pathname.substring(1)
    }

    public async getGeojson(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get", {
                id: this.getId(),
            })
            logger.info(`Got shape geojson ${res.length} bytes`)
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to read shape as geojson", error)
            return null
        }
    }

    async parse(value: string) {
        return JSON.parse(value)
    }
}

