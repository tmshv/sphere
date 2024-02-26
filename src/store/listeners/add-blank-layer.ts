import { createListenerMiddleware } from "@reduxjs/toolkit"
import { LayerType, SourceMetadata, SourceType } from "@/types"
import { nextId } from "@/lib/nextId"
import { actions } from "../actions"
import { RootState } from ".."

function predictLayerType({ pointsCount, linesCount, polygonsCount }: SourceMetadata): LayerType | null {
    if (pointsCount > 0 && linesCount === 0 && polygonsCount === 0) {
        return LayerType.Point
    }
    if (pointsCount === 0 && linesCount > 0 && polygonsCount === 0) {
        return LayerType.Line
    }
    if (pointsCount === 0 && linesCount === 0 && polygonsCount > 0) {
        return LayerType.Polygon
    }
    return null
}

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        const sourceId = action.payload
        const layerId = nextId("layer")
        const source = sourceId
            ? state.source.items[sourceId]
            : null
        let name = source
            ? source.name
            : "Layer"

        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            fractionIndex: 0.99999,
            visible: true,
            name,
            color: "#1c7ed6",
        }))

        if (sourceId && source) {
            let sourceLayer: string | undefined = undefined
            // Automatically set sourceLayer for MVT sources with only one layer in it
            if (source.type === SourceType.MVT && source.sourceLayers.length === 1) {
                sourceLayer = source.sourceLayers[0].id
            }

            listenerApi.dispatch(actions.layer.setSource({
                id: layerId,
                sourceId,
                sourceLayer,
            }))

            // try to predict default layer view
            if (source.type === SourceType.FeatureCollection && !source.pending) {
                const layerType = predictLayerType(source.meta)
                if (layerType) {
                    listenerApi.dispatch(actions.layer.setType({
                        id: layerId,
                        type: layerType,
                    }))
                }
            }
            // TODO: use smart prediction instead of just Point
            listenerApi.dispatch(actions.layer.setType({
                id: layerId,
                type: LayerType.Point,
            }))
        }

        listenerApi.dispatch(actions.selection.selectLayer({
            layerId,
        }))
    },
})

export default listener
