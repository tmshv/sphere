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

export type FileInfo = {
    size_bytes: number
    modified: string | null
}

export type CsvMode = "xy" | "wkt"

export type FormatDetails =
    | { format: "geojson" }
    | {
          format: "csv"
          mode: CsvMode
          wkt_column: string | null
          x_column: string | null
          y_column: string | null
          header_columns: string[]
          parsed_rows: number
          skipped_rows: number
      }
    | {
          format: "shapefile"
          has_dbf: boolean
          has_shx: boolean
          has_prj: boolean
          has_cpg: boolean
          crs: string | null
      }
    | {
          format: "gpx"
          waypoints: number
          tracks: number
          routes: number
          track_points: number
      }

export type SourceInfo = {
    file: FileInfo | null
    schema: SourceSchema
    details: FormatDetails
}

export type CsvGeometryParams = {
    mode: CsvMode
    wktColumn?: string
    xColumn?: string
    yColumn?: string
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

    public async getByIds(ids: number[]): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get_slice", {
                id: this.id,
                ids,
            })
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to read geojson slice %s", error)
            return null
        }
    }

    public async getSelected(): Promise<GeoJSON.FeatureCollection | null> {
        try {
            const res = await invoke<string>("source_get_selected", {
                id: this.id,
            })
            return this.parse(res)
        } catch (error) {
            logger.error("Failed to read selected geojson %s", error)
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

    public async getColumnStats(column: string, ids?: number[], topN?: number): Promise<ColumnStats | null> {
        try {
            return await invoke<ColumnStats>("source_get_column_stats", {
                id: this.id,
                column,
                ids,
                topN,
            })
        } catch (error) {
            logger.error("Failed to get column stats %s", error)
            return null
        }
    }

    public async getInfo(): Promise<SourceInfo | null> {
        try {
            return await invoke<SourceInfo>("source_get_info", {
                id: this.id,
            })
        } catch (error) {
            logger.error("Failed to get source info %s", error)
            return null
        }
    }

    public async setCsvGeometry(params: CsvGeometryParams): Promise<SourceSchema> {
        return await invoke<SourceSchema>("source_set_csv_geometry", {
            id: this.id,
            mode: params.mode,
            wktColumn: params.wktColumn ?? null,
            xColumn: params.xColumn ?? null,
            yColumn: params.yColumn ?? null,
        })
    }

    async parse(value: string) {
        return JSON.parse(value)
    }
}
