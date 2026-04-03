import { queryFeaturesInPoint } from "@/lib/maplibre"
import { emitSelectionDelta } from "@/lib/selection-bus"
import {
    type SelectionDelta,
    selectionSet,
    selectionAdd,
    selectionRemove,
    selectionClear,
    selectionApply,
    selectionCount,
} from "@/lib/selection-ipc"
import { actions, selectors } from "@/store"
import type { RootState } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect, useRef } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { useStore } from "react-redux"

const LAYER_SOURCE_PREFIX = "layer-"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectors.preview.layerIds],
    (layerIds, previewLayerIds) => (previewLayerIds.length > 0 ? [...layerIds, ...previewLayerIds] : layerIds),
)

function resolveSourceId(mapSourceId: string, state: RootState): string {
    if (mapSourceId.startsWith(LAYER_SOURCE_PREFIX)) {
        const layerId = mapSourceId.slice(LAYER_SOURCE_PREFIX.length)
        return state.layer.items[layerId]?.sourceId ?? mapSourceId
    }
    return mapSourceId
}

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const store = useStore<RootState>()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const mapTool = useAppSelector(selectMapTool)
    const processingRef = useRef(false)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || mapTool === "select") {
            return
        }

        const click = map.on("click", async event => {
            if (processingRef.current) return
            processingRef.current = true
            try {
                const features = queryFeaturesInPoint(event.target, event.point, layerIds)

                if (features.length > 0) {
                    const f = features[0]
                    const featureId = f.id
                    if (typeof featureId !== "number") {
                        return
                    }

                    const nativeEvent = event.originalEvent
                    const sourceId = resolveSourceId(f.source, store.getState())
                    const currentSourceId = store.getState().selection.sourceId
                    const sameSource = !currentSourceId || currentSourceId === sourceId

                    let delta: SelectionDelta
                    if (nativeEvent.shiftKey && sameSource) {
                        delta = await selectionAdd([featureId])
                    } else if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
                        if (sameSource) {
                            delta = await selectionRemove([featureId])
                        } else {
                            delta = await selectionSet([featureId])
                        }
                    } else {
                        delta = await selectionSet([featureId])
                    }

                    emitSelectionDelta(delta)

                    const applyDelta = await selectionApply()
                    emitSelectionDelta(applyDelta)

                    const count = await selectionCount()
                    dispatch(actions.selection.sync({ count, sourceId }))
                    dispatch(actions.selection.apply())
                    return
                }

                // Click on empty space — clear selection
                const delta = await selectionClear()
                emitSelectionDelta(delta)

                dispatch(actions.selection.reset())
                dispatch(actions.selection.apply())
            } finally {
                processingRef.current = false
            }
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, store, ref, layerIds, mapTool])

    return null
}
