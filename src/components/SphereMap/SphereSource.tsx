import { memo } from "react"
import { Source, SourceProps } from "react-map-gl"
import { useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import { assertUnreachable } from "@/lib"
export type SphereSourceProps = {
    id: string
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const source = useAppSelector(state => {
        const s = state.source.items[id]
        const { type } = s

        switch (type) {
            case SourceType.FeatureCollection: {
                return {
                    id,
                    type: "geojson",
                    data: s.dataset,
                } as SourceProps
            }
            case SourceType.Geojson: {
                return {
                    id,
                    type: "geojson",
                    data: s.location,
                } as SourceProps
            }
            case SourceType.MVT: {
                return {
                    id,
                    type: "vector",
                    url: s.location,
                } as SourceProps
            }
            case SourceType.Raster: {
                return null
            }
            default: {
                assertUnreachable(type)
            }
        }
    })
    if (!source) {
        return null
    }

    return (
        <Source {...source} />
    )
})

SphereSource.displayName = "SphereSource"
