import "@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css"

import { useCallback, useEffect } from "react"
import { useControl, useMap } from "react-map-gl/maplibre"
import MapLibreDraw from "@hyvilo/maplibre-gl-draw"
import type { ControlPosition } from "react-map-gl/maplibre"

type Handler = (ev: any) => void

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

    const handler = useCallback<Handler>(event => {
        if (typeof onChange === "function") {
            onChange(event, draw)
        }
    }, [onChange, draw])

    useEffect(() => {
        if (!map) {
            return
        }

        map.on("draw.create", handler)
        map.on("draw.update", handler)
        map.on("draw.delete", handler)
        map.on("draw.combine", handler)
        map.on("draw.uncombine", handler)

        return () => {
            map.off("draw.create", handler)
            map.off("draw.update", handler)
            map.off("draw.delete", handler)
            map.off("draw.combine", handler)
            map.off("draw.uncombine", handler)
        }
    }, [map, handler, draw])

    return draw
}
