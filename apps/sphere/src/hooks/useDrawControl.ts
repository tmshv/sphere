import { featureIds } from "@/lib/draw-selection"
import type { DrawOpQueue } from "@/lib/draw-session"
import type { DrawActionable, DrawEvent, DrawFeatureId } from "@/types"
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
    /** The queue must be stable across renders (hold it in a ref or state). When set, draw events are forwarded to the backend as ordered edit ops. */
    ops?: DrawOpQueue
    /** Receives the ids of the selected features after each `draw.selectionchange` (selected vertices are left out). */
    onSelectionChange?: (ids: DrawFeatureId[]) => void
    /** Receives the new mode after each `draw.modechange`. */
    onModeChange?: (mode: string) => void
    /** Receives which actions apply after each `draw.actionable`, as a copy: draw mutates its own object later. */
    onActionableChange?: (actionable: DrawActionable) => void
}

export function useDrawControl({
    ref,
    onChange,
    ops,
    onSelectionChange,
    onModeChange,
    onActionableChange,
    ...props
}: DrawControlProps): MapLibreDraw {
    const draw = useControl<MapLibreDraw>(() => new MapLibreDraw(props), {
        position: props.position,
    })

    useEffect(() => {
        if (!ref) {
            return
        }
        const map = ref.getMap()

        const listener = (event: DrawEvent) => {
            ops?.enqueueEvent(event)
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

    useEffect(() => {
        if (!ref || !onSelectionChange) {
            return
        }
        const subscription = ref.getMap().on("draw.selectionchange", (event: DrawEvent) => {
            onSelectionChange(featureIds(event.features ?? []))
        })
        return () => {
            subscription.unsubscribe()
        }
    }, [ref, onSelectionChange])

    useEffect(() => {
        if (!ref || !onModeChange) {
            return
        }
        const subscription = ref.getMap().on("draw.modechange", event => {
            onModeChange(event.mode)
        })
        return () => {
            subscription.unsubscribe()
        }
    }, [ref, onModeChange])

    useEffect(() => {
        if (!ref || !onActionableChange) {
            return
        }
        const subscription = ref.getMap().on("draw.actionable", ({ actions }) => {
            onActionableChange({
                trash: actions.trash,
                combineFeatures: actions.combineFeatures,
                uncombineFeatures: actions.uncombineFeatures,
            })
        })
        return () => {
            subscription.unsubscribe()
        }
    }, [ref, onActionableChange])

    return draw
}
