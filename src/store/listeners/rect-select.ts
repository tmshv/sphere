import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { queryFeaturesInPoint } from "@/lib/maplibre"
import { emitSelectionDelta } from "@/lib/selection-bus"
import {
    type SelectionDelta,
    selectionSet,
    selectionPreview,
    selectionAdd,
    selectionRemove,
    selectionApply,
    selectionClear,
    selectionCount,
} from "@/lib/selection-ipc"
import { invoke } from "@tauri-apps/api/core"
import maplibregl from "maplibre-gl"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectPreviewLayerIds } from "../preview"
import { rectSelectDrag, rectSelectCommit, rectSelectClick } from "../rect-select"

const THROTTLE_MS = 50

const listener = createListenerMiddleware()

let lastThrottle = 0
let queryGeneration = 0

function screenToGeoBbox(
    map: maplibregl.Map,
    start: { x: number; y: number },
    current: { x: number; y: number },
): [number, number, number, number] {
    const containerRect = map.getContainer().getBoundingClientRect()
    const sw = map.unproject([
        Math.min(start.x, current.x) - containerRect.left,
        Math.max(start.y, current.y) - containerRect.top,
    ])
    const ne = map.unproject([
        Math.max(start.x, current.x) - containerRect.left,
        Math.min(start.y, current.y) - containerRect.top,
    ])
    return [sw.lng, sw.lat, ne.lng, ne.lat]
}

listener.startListening({
    actionCreator: rectSelectDrag,
    effect: async (action, listenerApi) => {
        const now = Date.now()
        if (now - lastThrottle < THROTTLE_MS) {
            return
        }
        lastThrottle = now

        const generation = ++queryGeneration
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)

        const featureIds = await invoke<number[]>("source_query_rect", {
            id: sourceId,
            bbox,
            mode,
        })

        if (generation !== queryGeneration) return

        const delta = modifier === "shift" ? await selectionPreview(featureIds) : await selectionSet(featureIds)

        emitSelectionDelta(delta)
    },
})

listener.startListening({
    actionCreator: rectSelectCommit,
    effect: async (action, listenerApi) => {
        const generation = ++queryGeneration
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)

        const featureIds = await invoke<number[]>("source_query_rect", {
            id: sourceId,
            bbox,
            mode,
        })

        if (generation !== queryGeneration) return

        const delta = modifier === "shift" ? await selectionAdd(featureIds) : await selectionSet(featureIds)

        emitSelectionDelta(delta)

        const applyDelta = await selectionApply()
        emitSelectionDelta(applyDelta)

        const count = await selectionCount()
        listenerApi.dispatch(actions.selection.sync({ count, sourceId }))
        listenerApi.dispatch(actions.selection.apply())
    },
})

// Click: single feature selection in select tool mode
listener.startListening({
    actionCreator: rectSelectClick,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const map = getMap(MAP_ID)
        if (!map) return

        const { point, modifier } = action.payload
        const layerIds = selectPreviewLayerIds(state)
        const containerRect = map.getContainer().getBoundingClientRect()
        const mapPoint = new maplibregl.Point(point.x - containerRect.left, point.y - containerRect.top)
        const features = queryFeaturesInPoint(map, mapPoint, layerIds)

        if (features.length > 0) {
            const featureId = features[0].id
            if (typeof featureId !== "number") return

            let delta: SelectionDelta
            switch (modifier) {
                case "shift": {
                    delta = await selectionAdd([featureId])
                    break
                }
                case "ctrl": {
                    delta = await selectionRemove([featureId])
                    break
                }
                default: {
                    delta = await selectionSet([featureId])
                    break
                }
            }
            emitSelectionDelta(delta)
        } else {
            const delta = await selectionClear()
            emitSelectionDelta(delta)
        }

        const applyDelta = await selectionApply()
        emitSelectionDelta(applyDelta)

        const count = await selectionCount()
        const sourceId = state.source.selectedId
        listenerApi.dispatch(actions.selection.sync({ count, sourceId }))
        listenerApi.dispatch(actions.selection.apply())
    },
})

export default listener
