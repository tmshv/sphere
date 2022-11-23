import { memo } from "react";
import { Source } from "react-map-gl";
import { useAppSelector } from "@/store/hooks";
import { SourceType } from "@/types";
import { assertUnreachable } from "@/lib";

export type SphereSourceProps = {
    id: string
}

export const SphereSource: React.FC<SphereSourceProps> = memo(({ id }) => {
    const source = useAppSelector(state => {
        const { type, dataset } = state.source.items[id]

        switch (type) {
            case SourceType.FeatureCollection: {
                return {
                    type: "geojson",
                    data: dataset,
                }
            }
            case SourceType.Geojson: {
                return {
                    type: "geojson",
                    data: dataset,
                }
            }
            case SourceType.MVT: {
                return null
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
        <Source
            id={id}
            type={source.type as "geojson"}
            data={source.data}
        >
        </Source>
    );
})

SphereSource.displayName = "SphereSource"
