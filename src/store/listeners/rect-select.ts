import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { queryFeaturesInPoint, queryFeaturesInRect, serializeFeaturesForIpc } from "@/lib/maplibre"
import { emitSelectionDelta, emitSelectionReconcile } from "@/lib/selection-bus"
import {
    type SelectionDelta,
    type SelectionRectOp,
    selectionAdd,
    selectionApply,
    selectionCacheFeatures,
    selectionClear,
    selectionCount,
    selectionGetIds,
    selectionRect,
    selectionRectFeatures,
    selectionRemove,
    selectionSet,
} from "@/lib/selection-ipc"
import { SourceType } from "@/types"
import type { MapGeoJSONFeature } from "maplibre-gl"
import maplibregl from "maplibre-gl"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectPreviewLayerIds } from "../preview"
import { type RectSelectModifier, rectSelectDrag, rectSelectCommit, rectSelectClick } from "../rect-select"

const listener = createListenerMiddleware()

type DragPayload = {
    start: { x: number; y: number }
    current: { x: number; y: number }
    modifier: RectSelectModifier
}

type Bbox = [number, number, number, number]

let queryGeneration = 0
let dragSession = 0
let dragInFlight = false
let pendingDrag: DragPayload | null = null
let lastDragBbox: Bbox | null = null
let lastDragMode: "include" | "intersect" | null = null
let lastDragOp: SelectionRectOp | null = null

function screenToGeoBbox(
    map: maplibregl.Map,
    start: { x: number; y: number },
    current: { x: number; y: number },
): Bbox {
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

function bboxEqual(a: Bbox, b: Bbox): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

function resetDragDedup(): void {
    lastDragBbox = null
    lastDragMode = null
    lastDragOp = null
}

function isMvtSource(state: RootState, sourceId: string): boolean {
    const source = state.source.items[sourceId]
    return source?.type === SourceType.MVT
}

listener.startListening({
    actionCreator: rectSelectDrag,
    effect: async (action, listenerApi) => {
        pendingDrag = action.payload
        if (dragInFlight) return
        dragInFlight = true
        const session = dragSession
        try {
            while (pendingDrag) {
                const payload = pendingDrag
                pendingDrag = null

                if (session !== dragSession) break

                const state = listenerApi.getState() as RootState
                const sourceId = state.source.selectedId
                if (!sourceId) continue

                const map = getMap(MAP_ID)
                if (!map) continue

                const { start, current, modifier } = payload
                const mode = current.x >= start.x ? "include" : "intersect"
                const bbox = screenToGeoBbox(map, start, current)
                const op: SelectionRectOp = modifier === "shift" ? "preview" : "set"

                if (lastDragBbox && lastDragMode === mode && lastDragOp === op && bboxEqual(lastDragBbox, bbox)) {
                    continue
                }
                lastDragBbox = bbox
                lastDragMode = mode
                lastDragOp = op

                const generation = ++queryGeneration
                let delta: SelectionDelta

                if (isMvtSource(state, sourceId)) {
                    const layerIds = selectPreviewLayerIds(state)
                    const containerRect = map.getContainer().getBoundingClientRect()
                    const screenStart = {
                        x: start.x - containerRect.left,
                        y: start.y - containerRect.top,
                    }
                    const screenCurrent = {
                        x: current.x - containerRect.left,
                        y: current.y - containerRect.top,
                    }
                    const features = queryFeaturesInRect(map, screenStart, screenCurrent, layerIds)
                    const featuresJson = serializeFeaturesForIpc(features)
                    delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)
                } else {
                    delta = await selectionRect(sourceId, bbox, mode, op, generation)
                }

                if (session !== dragSession) break

                emitSelectionDelta(delta)
            }
        } finally {
            dragInFlight = false
        }
    },
})

listener.startListening({
    actionCreator: rectSelectCommit,
    effect: async (action, listenerApi) => {
        dragSession++
        pendingDrag = null
        resetDragDedup()

        const generation = ++queryGeneration
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)
        const op = modifier === "shift" ? "add" : "set"

        let delta: SelectionDelta

        if (isMvtSource(state, sourceId)) {
            const layerIds = selectPreviewLayerIds(state)
            const containerRect = map.getContainer().getBoundingClientRect()
            const screenStart = {
                x: start.x - containerRect.left,
                y: start.y - containerRect.top,
            }
            const screenCurrent = {
                x: current.x - containerRect.left,
                y: current.y - containerRect.top,
            }
            const features = queryFeaturesInRect(map, screenStart, screenCurrent, layerIds)
            const featuresJson = serializeFeaturesForIpc(features)
            delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)
        } else {
            delta = await selectionRect(sourceId, bbox, mode, op, generation)
        }

        emitSelectionDelta(delta)

        const applyDelta = await selectionApply()
        emitSelectionDelta(applyDelta)

        // Reconcile frontend highlights with authoritative backend state
        // to correct any drift from dropped stale drag deltas
        const ids = await selectionGetIds()
        emitSelectionReconcile(ids, sourceId)

        const count = await selectionCount()
        listenerApi.dispatch(actions.selection.sync({ count, sourceId }))
        listenerApi.dispatch(actions.selection.apply())
    },
})

// Click: single feature selection in select tool mode
listener.startListening({
    actionCreator: rectSelectClick,
    effect: async (action, listenerApi) => {
        dragSession++
        pendingDrag = null
        resetDragDedup()

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

            const sourceId = state.source.selectedId
            if (sourceId && isMvtSource(state, sourceId)) {
                const featuresJson = serializeFeaturesForIpc(features as unknown as MapGeoJSONFeature[])
                await selectionCacheFeatures(featuresJson)
            }
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
