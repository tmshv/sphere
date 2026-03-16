import { memo } from "react"
import { Source, SourceProps } from "react-map-gl/maplibre"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { assertUnreachable } from "@/lib"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "@/store"
import { EMPTY_GEOJSON } from "@/const"

export const selectSource = createSelector(
    [(state: RootState, id: string) => state.source.items[id]],
    source => {
        if (!source) {
            return null
        }
        const { type, id } = source
        switch (type) {
            case SourceType.FeatureCollection: {
                return {
                    id,
                    type: "geojson",
                    data: source.dataset,
                } as SourceProps
            }
            case SourceType.Geojson: {
                return {
                    id,
                    type: "geojson",
                    data: source.dataset ?? EMPTY_GEOJSON,
                } as SourceProps
            }
            case SourceType.MVT: {
                return {
                    id,
                    type: "vector",
                    url: `sphere://mbtiles/${id}`,
                } as SourceProps
            }
            case SourceType.Raster: {
                return {
                    id,
                    type: "raster",
                    url: source.location,
                } as SourceProps
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
    const source = useAppSelector(state => selectSource(state, id))
    if (!source) {
        return null
    }

    return (
        <Source {...source} />
    )
})

SphereSource.displayName = "SphereSource"
