import { EMPTY_GEOJSON } from "@/const"
import { assertUnreachable } from "@/lib"
import logger from "@/logger"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { isRasterTileFormat } from "@/lib/tilejson"
import { invoke } from "@tauri-apps/api/core"
import { memo, useEffect, useState } from "react"
import { Source } from "react-map-gl/maplibre"

export type SphereSourceProps = {
    id: string
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const source = useAppSelector(state => state.source.items[id])
    const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection>(
        EMPTY_GEOJSON as GeoJSON.FeatureCollection,
    )

    const sourceType = source?.type

    const version = useAppSelector(state => {
        const s = state.source.items[id]
        if (s?.type === SourceType.FeatureCollection && !s.pending) return s.version
        return null
    })

    useEffect(() => {
        if (!sourceType || sourceType !== SourceType.Geojson) {
            return
        }
        invoke<string>("source_get", { id })
            .then(json => {
                setGeojsonData(JSON.parse(json))
            })
            .catch(err => {
                logger.error("Failed to fetch GeoJSON source %s: %s", id, err)
            })
    }, [id, sourceType])

    useEffect(() => {
        if (version === null) return
        invoke<string>("source_get", { id })
            .then(json => setGeojsonData(JSON.parse(json)))
            .catch(err => {
                logger.error("Failed to fetch source %s version %d: %s", id, version, err)
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
                return <Source id={id} type="raster" url={`sphere://mbtiles/${id}`} tileSize={256} />
            }
            return <Source id={id} type="vector" url={`sphere://mbtiles/${id}`} />
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
