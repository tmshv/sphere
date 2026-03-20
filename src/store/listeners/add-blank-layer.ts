import { nextColor } from "@/lib/color-scheme"
import { nextId } from "@/lib/nextId"
import predictLayerType from "@/lib/predict-layer-type"
import { LayerType, SourceType } from "@/types"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        const sourceId = action.payload
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
            let sourceLayer: string | undefined = undefined
            // Automatically set sourceLayer for MVT sources with only one layer in it
            if (source.type === SourceType.MVT && source.sourceLayers.length === 1) {
                sourceLayer = source.sourceLayers[0].id
            }

            listenerApi.dispatch(
                actions.layer.setSource({
                    id: layerId,
                    sourceId,
                    sourceLayer,
                }),
            )

            // try to predict default layer view
            if (source.type === SourceType.FeatureCollection && !source.pending) {
                const layerType = predictLayerType(source.meta) ?? LayerType.Point
                listenerApi.dispatch(
                    actions.layer.setType({
                        id: layerId,
                        type: layerType,
                    }),
                )
            }

            // predict default layer view for GeoJSON
            if (source.type === SourceType.Geojson) {
                const layerType = predictLayerType(source.meta) ?? LayerType.Point
                listenerApi.dispatch(
                    actions.layer.setType({
                        id: layerId,
                        type: layerType,
                    }),
                )
            }
        }

        listenerApi.dispatch(
            actions.selection.selectLayer({
                layerId,
            }),
        )
        listenerApi.dispatch(actions.app.setActiveSidebarTab("layers"))
    },
})

export default listener
