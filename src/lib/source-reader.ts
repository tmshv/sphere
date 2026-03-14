import logger from "@/logger"
import { invoke } from "@tauri-apps/api/core"
import type { LngLatBoundsLike } from "maplibre-gl"
import type { SourceSchema } from "@/types"

type Bbox = [number, number, number, number]

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
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to read geojson %s", error)
            return null
        }
    }

    public async getBounds(): Promise<LngLatBoundsLike | null> {
        try {
            const bounds = await invoke<Bbox>("source_bounds", {
                id: this.getId(),
            })
            return bounds
        } catch (error) {
            logger.error("Failed to get bounds %s", error)
            return null
        }
    }

    public async getSchema(): Promise<SourceSchema | null> {
        try {
            return invoke<SourceSchema>("source_get_schema", {
                id: this.getId(),
            })
        } catch (error) {
            logger.error("Failed to get schema %s", error)
            return null
        }
    }

    async parse(value: string) {
        return JSON.parse(value)
    }
}
