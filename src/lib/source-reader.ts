import logger from "@/logger"
import type { SourceSchema } from "@/types"
import { invoke } from "@tauri-apps/api/core"
import type { LngLatBoundsLike } from "maplibre-gl"

type Bbox = [number, number, number, number]

export type PageResult = {
    features: GeoJSON.Feature[]
    total_matching: number
    offset: number
    limit: number
}

export type HistogramBin = {
    min: number
    max: number
    count: number
}

export type ColumnStats = {
    column: string
    col_type: string
    count: number
    null_count: number
    min?: number
    max?: number
    mean?: number
    histogram?: HistogramBin[]
    unique_count?: number
    top_values?: [string, number][]
}

export class SourceReader {
    constructor(private id: string) {}

    public async getGeojson(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get", {
                id: this.id,
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
                id: this.id,
            })
            return bounds
        } catch (error) {
            logger.error("Failed to get bounds %s", error)
            return null
        }
    }

    public async getSchema(): Promise<SourceSchema | null> {
        try {
            return await invoke<SourceSchema>("source_get_schema", {
                id: this.id,
            })
        } catch (error) {
            logger.error("Failed to get schema %s", error)
            return null
        }
    }

    public async getFiltered(filterJson?: string): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get_filtered", {
                id: this.id,
                filterJson: filterJson ?? null,
            })
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to get filtered geojson %s", error)
            return null
        }
    }

    public async queryPage(
        offset: number,
        limit: number,
        sortColumn?: string,
        sortAsc?: boolean,
        filterJson?: string,
    ): Promise<PageResult | null> {
        try {
            return await invoke<PageResult>("source_query_page", {
                id: this.id,
                offset,
                limit,
                sortColumn: sortColumn ?? null,
                sortAsc: sortAsc ?? null,
                filterJson: filterJson ?? null,
            })
        } catch (error) {
            logger.error("Failed to query page %s", error)
            return null
        }
    }

    public async getColumnStats(column: string): Promise<ColumnStats | null> {
        try {
            return await invoke<ColumnStats>("source_get_column_stats", {
                id: this.id,
                column,
            })
        } catch (error) {
            logger.error("Failed to get column stats %s", error)
            return null
        }
    }

    async parse(value: string) {
        return JSON.parse(value)
    }
}
