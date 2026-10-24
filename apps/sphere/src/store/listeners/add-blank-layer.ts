import { nextColor } from "@sphere/utils"
import { nextId } from "@/lib/nextId"
import predictLayerType, { fallbackLayerType } from "@/lib/predict-layer-type"
import { hasFeatureStore } from "@/lib/source"
import { resolveSourceRef } from "@/lib/source-tree"
import { LayerType, SourceType } from "@/types"
import { isRasterTileFormat } from "@/lib/tilejson"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        // The payload is a node id: a source-layer binds its parent source and its own vector layer
        const nodeId = action.payload
        const ref = nodeId ? resolveSourceRef(state.source.nodes, nodeId) : undefined
        const sourceId = ref?.sourceId
        const layerId = nextId("layer")
        const source = sourceId ? state.source.items[sourceId] : undefined
        const name = source ? source.name : "Layer"

        listenerApi.dispatch(
            actions.layer.addLayer({
                id: layerId,
                fractionIndex: 0.99999,
                visible: true,
                name,
                color: nextColor(),
            }),
        )

        if (sourceId && source) {
            let sourceLayer = ref?.sourceLayer
            // Automatically set sourceLayer for MVT sources with only one layer in it
            if (sourceLayer === undefined && source.type === SourceType.MVT && source.sourceLayers.length === 1) {
                sourceLayer = source.sourceLayers.at(0)?.id
            }

            listenerApi.dispatch(
                actions.layer.setSource({
                    id: layerId,
                    sourceId,
                    sourceLayer,
                }),
            )

            // try to predict default layer view
            if (hasFeatureStore(source)) {
                const layerType = predictLayerType(source.meta) ?? fallbackLayerType(source.meta)
                listenerApi.dispatch(
                    actions.layer.setType({
                        id: layerId,
                        type: layerType,
                    }),
                )
            } else if (source.type === SourceType.MVT && isRasterTileFormat(source.format)) {
                listenerApi.dispatch(
                    actions.layer.setType({
                        id: layerId,
                        type: LayerType.Raster,
                    }),
                )
            }
        }

        listenerApi.dispatch(actions.layer.select(layerId))
        listenerApi.dispatch(actions.app.setActiveSidebarTab("layers"))
    },
})

export default listener
