import { EMPTY_GEOJSON } from "@/const"
import { assertUnreachable } from "@/lib"
import logger from "@/logger"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import type { Source as SourceEntry } from "@/types/source"
import { isRasterTileFormat } from "@/lib/tilejson"
import { invoke } from "@tauri-apps/api/core"
import { memo, useEffect, useState } from "react"
import { Source } from "react-map-gl/maplibre"

export type SphereSourceProps = {
    id: string
}

export function selectSourceVersion(source: SourceEntry | undefined): number | null {
    if (!source) {
        return null
    }
    if (source.type === SourceType.Geojson) {
        return source.version
    }
    if (source.type === SourceType.FeatureCollection && !source.pending) {
        return source.version
    }
    return null
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const source = useAppSelector(state => state.source.items[id])
    const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection>(
        EMPTY_GEOJSON as GeoJSON.FeatureCollection,
    )

    const version = useAppSelector(state => selectSourceVersion(state.source.items[id]))

    useEffect(() => {
        if (version === null) return
        invoke<string>("source_get", { id })
            .then(json => setGeojsonData(JSON.parse(json)))
            .catch(err => {
                logger.error("Failed to fetch source %s version %s: %s", id, version, err)
            })
    }, [id, version])

    if (!source) {
        return null
    }

    const { type } = source
    switch (type) {
        case SourceType.FeatureCollection: {
            return <Source id={id} type="geojson" data={geojsonData} />
        }
        case SourceType.Geojson: {
            return <Source id={id} type="geojson" data={geojsonData} />
        }
        case SourceType.MVT: {
            if (isRasterTileFormat(source.format)) {
                return <Source id={id} type="raster" url={`sphere://${id}/tilejson`} tileSize={256} />
            }
            return <Source id={id} type="vector" url={`sphere://${id}/tilejson`} />
        }
        case SourceType.Raster: {
            return <Source id={id} type="raster" url={source.location} />
        }
        default: {
            assertUnreachable(type)
        }
    }
})

SphereSource.displayName = "SphereSource"
