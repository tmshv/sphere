import { EMPTY_GEOJSON } from "@/const"
import { assertUnreachable } from "@/lib"
import type { RootState } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { isRasterTileFormat } from "@/types/tilejson"
import { createSelector } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { memo, useEffect, useState } from "react"
import { Source, type SourceProps } from "react-map-gl/maplibre"

export const selectSource = createSelector(
    [(state: RootState, id: string) => state.source.items[id]],
    (source): SourceProps | null => {
        if (!source) {
            return null
        }
        const { type, id } = source
        switch (type) {
            case SourceType.FeatureCollection: {
                return {
                    id,
                    type: "geojson",
                    data: source.dataset ?? (EMPTY_GEOJSON as GeoJSON.FeatureCollection),
                }
            }
            case SourceType.Geojson: {
                // Data is fetched directly in the component to avoid storing it in Redux.
                return null
            }
            case SourceType.MVT: {
                if (isRasterTileFormat(source.format)) {
                    return {
                        id,
                        type: "raster",
                        url: `sphere://mbtiles/${id}`,
                        tileSize: 256,
                    }
                }
                return {
                    id,
                    type: "vector",
                    url: `sphere://mbtiles/${id}`,
                }
            }
            case SourceType.Raster: {
                return {
                    id,
                    type: "raster",
                    url: source.location,
                }
            }
            default: {
                assertUnreachable(type)
            }
        }
    },
)

export type SphereSourceProps = {
    id: string
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const source = useAppSelector(state => state.source.items[id])
    const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection>(
        EMPTY_GEOJSON as GeoJSON.FeatureCollection,
    )

    const sourceType = source?.type

    useEffect(() => {
        if (!sourceType || sourceType !== SourceType.Geojson) {
            return
        }
        invoke<string>("source_get", { id })
            .then(json => {
                setGeojsonData(JSON.parse(json))
            })
            .catch(() => {})
    }, [id, sourceType])

    if (!source) {
        return null
    }

    const { type } = source
    switch (type) {
        case SourceType.FeatureCollection: {
            return (
                <Source id={id} type="geojson" data={source.dataset ?? (EMPTY_GEOJSON as GeoJSON.FeatureCollection)} />
            )
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
