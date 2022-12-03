import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"

import MapboxDraw from "@mapbox/mapbox-gl-draw"
import { useControl, useMap } from "react-map-gl"
import type { ControlPosition } from "react-map-gl"
import { useCallback, useEffect } from "react"

type Handler = (ev: any) => void

export type OnChangeDraw = (event: { features: GeoJSON.Feature[]; type: string }, draw: MapboxDraw) => void

export type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    id?: string
    position?: ControlPosition
    onChange?: OnChangeDraw
};

export function useDrawControl({ id, onChange, ...props }: DrawControlProps): MapboxDraw {
    const { [id ?? "current"]: map } = useMap()
    const draw = useControl<MapboxDraw>(
        () => new MapboxDraw(props),
        {
            position: props.position,
        }
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
