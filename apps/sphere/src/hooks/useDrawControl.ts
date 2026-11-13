import { eventToOps } from "@/lib/draw-session"
import type { DrawOpQueue } from "@/lib/draw-session"
import type { DrawEvent } from "@/types"
import logger from "@/logger"
import MapLibreDraw from "@sphere/draw"
import { useEffect } from "react"
import { useControl } from "react-map-gl/maplibre"
import type { ControlPosition, MapRef } from "react-map-gl/maplibre"

export type { DrawEvent }

export type OnChangeDraw = (event: DrawEvent, draw: MapLibreDraw) => void

export type DrawControlProps = ConstructorParameters<typeof MapLibreDraw>[0] & {
    ref: MapRef | undefined
    position?: ControlPosition
    onChange?: OnChangeDraw
    /** When set, draw events are forwarded to the backend as ordered edit ops. */
    ops?: DrawOpQueue
}

export function useDrawControl({ ref, onChange, ops, ...props }: DrawControlProps): MapLibreDraw {
    const draw = useControl<MapLibreDraw>(() => new MapLibreDraw(props), {
        position: props.position,
    })

    useEffect(() => {
        if (!ref) {
            return
        }
        const map = ref.getMap()

        const listener = (event: DrawEvent) => {
            if (ops) {
                try {
                    ops.enqueue(eventToOps(event))
                } catch (err) {
                    logger.error("Failed to map draw event %s: %s", event.type, err)
                }
            }
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
    }, [ref, onChange, ops, draw])

    return draw
}
