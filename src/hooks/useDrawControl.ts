import { useEffect } from "react"
import { useControl, useMap } from "react-map-gl/maplibre"
import MapLibreDraw from "@hyvilo/maplibre-gl-draw"
import type { ControlPosition } from "react-map-gl/maplibre"
import type { Listener } from "maplibre-gl"

export type OnChangeDraw = (event: { features: GeoJSON.Feature[]; type: string }, draw: MapLibreDraw) => void

export type DrawControlProps = ConstructorParameters<typeof MapLibreDraw>[0] & {
    id?: string
    position?: ControlPosition
    onChange?: OnChangeDraw
};

export function useDrawControl({ id, onChange, ...props }: DrawControlProps): MapLibreDraw {
    const { [id ?? "current"]: map } = useMap()
    const draw = useControl<MapLibreDraw>(() => new MapLibreDraw(props),
        {
            position: props.position,
        },
    )

    useEffect(() => {
        if (!map) {
            return
        }

        const listener: Listener = event => {
            if (typeof onChange === "function") {
                onChange(event, draw)
            }
        }

        const create = map.on("draw.create", listener)
        const update = map.on("draw.update", listener)
        const delete_ = map.on("draw.delete", listener)
        const combine = map.on("draw.combine", listener)
        const uncombine = map.on("draw.uncombine", listener)

        return () => {
            create.unsubscribe()
            update.unsubscribe()
            delete_.unsubscribe()
            combine.unsubscribe()
            uncombine.unsubscribe()
        }
    }, [map, onChange, draw])

    return draw
}
