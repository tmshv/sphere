import logger from "@/logger"
import { invoke } from "@tauri-apps/api"

export class SourceReader {
    constructor(public location: string) {
    }

    public async getGeojson(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get", {
                sourceUrl: this.location,
            })
            logger.info(`Got geojson ${res.length} bytes`)
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to read geojson", error)
            return null
        }
    }

    async parse(value: string) {
        return (new Response(value)).json()
    }
}

