import MapLibreDraw from "@hyvilo/maplibre-gl-draw"
import { useEffect } from "react"
import { useControl } from "react-map-gl/maplibre"
import type { ControlPosition, MapRef } from "react-map-gl/maplibre"

export type DrawEvent = {
    features?: GeoJSON.Feature[]
    createdFeatures?: GeoJSON.Feature[]
    deletedFeatures?: GeoJSON.Feature[]
    type: string
}

export type OnChangeDraw = (event: DrawEvent, draw: MapLibreDraw) => void

export type DrawControlProps = ConstructorParameters<typeof MapLibreDraw>[0] & {
    ref: MapRef | undefined
    position?: ControlPosition
    onChange?: OnChangeDraw
}

export function useDrawControl({ ref, onChange, ...props }: DrawControlProps): MapLibreDraw {
    const draw = useControl<MapLibreDraw>(() => new MapLibreDraw(props), {
        position: props.position,
    })

    useEffect(() => {
        if (!ref) {
            return
        }
        const map = ref.getMap()

        const listener = (event: DrawEvent) => {
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
    }, [ref, onChange, draw])

    return draw
}
