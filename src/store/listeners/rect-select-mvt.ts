import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { bboxEqual, screenToGeoBbox } from "@/lib/bbox"
import type { Bbox } from "@/types/bbox"
import { queryFeaturesInPoint, queryFeaturesInScreenRect, serializeFeaturesForIpc } from "@/lib/maplibre"
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
    selectionRectFeatures,
    selectionRemove,
    selectionSet,
} from "@/lib/selection-ipc"
import { isMvtSource } from "@/lib/source"
import type { MapGeoJSONFeature } from "maplibre-gl"
import maplibregl from "maplibre-gl"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectPreviewLayerIds } from "../preview"
import { type RectSelectModifier, rectSelectClick, rectSelectCommit, rectSelectDrag } from "../rect-select"

const listener = createListenerMiddleware()

type DragPayload = {
    start: { x: number; y: number }
    current: { x: number; y: number }
    modifier: RectSelectModifier
}

let queryGeneration = 0
let dragSession = 0
let dragInFlight = false
let pendingDrag: DragPayload | null = null
let lastDragBbox: Bbox | null = null
let lastDragMode: "include" | "intersect" | null = null
let lastDragOp: SelectionRectOp | null = null

function resetDragDedup(): void {
    lastDragBbox = null
    lastDragMode = null
    lastDragOp = null
}

listener.startListening({
    actionCreator: rectSelectDrag,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return
        if (!isMvtSource(state.source.items[sourceId])) return

        pendingDrag = action.payload
        if (dragInFlight) return
        dragInFlight = true
        const session = dragSession
        try {
            while (pendingDrag) {
                const payload = pendingDrag
                pendingDrag = null

                if (session !== dragSession) break

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

                const layerIds = selectPreviewLayerIds(state)
                const features = queryFeaturesInScreenRect(map, start, current, layerIds)
                const featuresJson = serializeFeaturesForIpc(features)

                const generation = ++queryGeneration
                const delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)

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
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return
        if (!isMvtSource(state.source.items[sourceId])) return

        dragSession++
        pendingDrag = null
        resetDragDedup()

        const map = getMap(MAP_ID)
        if (!map) return

        const { start, current, modifier } = action.payload
        const mode = current.x >= start.x ? "include" : "intersect"
        const bbox = screenToGeoBbox(map, start, current)
        const op = modifier === "shift" ? "add" : "set"

        const layerIds = selectPreviewLayerIds(state)
        const features = queryFeaturesInScreenRect(map, start, current, layerIds)
        const featuresJson = serializeFeaturesForIpc(features)

        const generation = ++queryGeneration
        const delta = await selectionRectFeatures(featuresJson, bbox, mode, op, generation)
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
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.selectedId
        if (!sourceId) return
        if (!isMvtSource(state.source.items[sourceId])) return

        dragSession++
        pendingDrag = null
        resetDragDedup()

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

            const featuresJson = serializeFeaturesForIpc(features as unknown as MapGeoJSONFeature[])
            await selectionCacheFeatures(featuresJson)
        } else {
            const delta = await selectionClear()
            emitSelectionDelta(delta)
        }

        const applyDelta = await selectionApply()
        emitSelectionDelta(applyDelta)

        const count = await selectionCount()
        listenerApi.dispatch(actions.selection.sync({ count, sourceId }))
        listenerApi.dispatch(actions.selection.apply())
    },
})

export default listener
