import { queryFeaturesInPoint } from "@/lib/maplibre"
import { emitSelectionDelta } from "@/lib/selection-bus"
import {
    selectionSet,
    selectionAdd,
    selectionRemove,
    selectionClear,
    selectionApply,
    selectionCount,
} from "@/lib/selection-ipc"
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectors.preview.layerIds],
    (layerIds, previewLayerIds) => (previewLayerIds.length > 0 ? [...layerIds, ...previewLayerIds] : layerIds),
)

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const mapTool = useAppSelector(selectMapTool)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || mapTool === "select") {
            return
        }

        const click = map.on("click", async event => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)

            if (features.length > 0) {
                const f = features[0]
                const featureId = f.id
                if (typeof featureId !== "number") {
                    return
                }

                const nativeEvent = event.originalEvent
                let delta
                if (nativeEvent.shiftKey) {
                    delta = await selectionAdd([featureId])
                } else if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
                    delta = await selectionRemove([featureId])
                } else {
                    delta = await selectionSet([featureId])
                }

                emitSelectionDelta(delta)

                const applyDelta = await selectionApply()
                emitSelectionDelta(applyDelta)

                const count = await selectionCount()
                dispatch(actions.selection.sync({ count }))
                dispatch(actions.selection.apply())
                return
            }

            // Click on empty space — clear selection
            const delta = await selectionClear()
            emitSelectionDelta(delta)

            dispatch(actions.selection.reset())
            dispatch(actions.selection.apply())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, mapTool])

    return null
}
