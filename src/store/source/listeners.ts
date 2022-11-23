import * as turf from '@turf/turf'
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getMap } from '@/map'
import mapboxgl from 'mapbox-gl'
import { LayerType, ParserMetadata, SourceType } from '@/types'
import { nextId } from '@/lib/nextId'
import { actions } from './';
import { assertUnreachable } from '@/lib';

function predictLayerType({ pointsCount, linesCount, polygonsCount }: ParserMetadata): LayerType | null {
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

export const sourceListener = createListenerMiddleware();
sourceListener.startListening({
    actionCreator: actions.addRemote,
    effect: async (action, listenerApi) => {
        return 
        // console.log('listen', action, json)
        //         const dataset = action.payload.dataset as GeoJSON.FeatureCollection
        //         const meta = action.payload.meta as ParserMetadata
        //         const name = action.payload.name as string
        //         const location = action.payload.location as string

        //         if (dataset.features.length === 0) {
        //             return
        //         }

        //         const sourceId = nextId("source")
        //         listenerApi.dispatch(actions.source.addFeatureCollection({
        //             id: sourceId,
        //             // type: SourceType.FeatureCollection,
        //             name,
        //             location,
        //             dataset,
        //         }))

        //         const layerType = predictLayerType(meta)
        //         if (!layerType) {
        //             return
        //         }

        //         const layerId = nextId("layer")
        //         listenerApi.dispatch(actions.layer.addLayer({
        //             id: layerId,
        //             sourceId,
        //             fractionIndex: Math.random(),
        //             visible: true,
        //             name: name,
        //             color: "#1c7ed6",
        //         }))
        //         listenerApi.dispatch(actions.layer.setType({
        //             id: layerId,
        //             type: layerType,
        //         }))
    },
});
