import { open } from '@tauri-apps/api/dialog';
import { isAnyOf } from '@reduxjs/toolkit'
import { selectionSlice } from './selection'
import { appSlice } from './app'
import { fitBounds, resize } from './map'
import * as turf from '@turf/turf'
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getMap } from '@/map'
import mapboxgl from 'mapbox-gl'
import { Dataset, LayerType, SourceType } from '@/types'
import { nextId } from '@/lib/nextId'
import { featureCollection } from '@turf/turf'
import { duplicate } from './layer';
import { actions } from './actions';
import { RootState } from '.';

const sourceToLayer = new Map<SourceType, LayerType>([
    [SourceType.Points, LayerType.Point],
    [SourceType.Lines, LayerType.Line],
    [SourceType.Polygons, LayerType.Polygon],
])

export const mapResizeMiddleware = createListenerMiddleware();
mapResizeMiddleware.startListening({
    actionCreator: resize,
    effect: async (action, listenerApi) => {
        const mapId = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        map.resize()
    },
});

export const readFromFilesMiddleware = createListenerMiddleware();
readFromFilesMiddleware.startListening({
    actionCreator: actions.source.addFromFiles,
    effect: async (action, listenerApi) => {
        for (const file of action.payload) {
            listenerApi.dispatch(actions.source.addFromFile(file))
        }

        listenerApi.dispatch(actions.app.showLeftSidebar())

        // await listenerApi.delay(1000)

        // const state = listenerApi.getState() as RootState
        // const id = state.source.lastAdded
        // if (!id) {
        //     return
        // }

        // const geom = state.source.items[id].data
        // const bbox = turf.bbox(geom);

        // listenerApi.dispatch(fitBounds({
        //     mapId: "spheremap",
        //     bounds: bbox as mapboxgl.LngLatBoundsLike
        // }))
    },
});

export const zoomToMiddleware = createListenerMiddleware();
zoomToMiddleware.startListening({
    actionCreator: actions.source.zoomTo,
    effect: async (action, listenerApi) => {
        const mapId = "spheremap"
        const map = getMap(mapId)
        if (!map) {
            return
        }

        const sourceId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const source = state.source.items[sourceId]
        if (!source) {
            return
        }

        const fc = featureCollection(source.data.map(g => {
            return {
                type: "Feature",
                geometry: g.geometry,
                properties: {},
            }
        }))
        const bbox = turf.bbox(fc);

        listenerApi.dispatch(fitBounds({
            mapId,
            bounds: bbox as mapboxgl.LngLatBoundsLike
        }))
    },
});

export const fitBoundsMiddleware = createListenerMiddleware();
fitBoundsMiddleware.startListening({
    actionCreator: fitBounds,
    effect: async (action, listenerApi) => {
        const { mapId, bounds } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }
        map.fitBounds(bounds)
    },
});

export const selectFeaturesMiddleware = createListenerMiddleware();
selectFeaturesMiddleware.startListening({
    actionCreator: selectionSlice.actions.selectOne,
    effect: async (action, listenerApi) => {
        // const state = listenerApi.getOriginalState() as RootState
        // const { featureId, sourceId } = action.payload
        // const source = state.source.items[sourceId]
        // const f = source.data.data.find(f => f.id === featureId)
        // if (!f) {
        //     return
        // }

        console.log("select!");
        // console.log(f.properties);
    },
});

export const addSourceMiddleware = createListenerMiddleware();
addSourceMiddleware.startListening({
    matcher: isAnyOf(
        actions.source.addFromFile.fulfilled,
        actions.source.addFromUrl.fulfilled,
    ),
    effect: async (action, listenerApi) => {
        console.log("Adding", action)
        const payload = action.payload as Dataset[]
        if (!payload) {
            return
        }
        for (const dataset of payload) {
            if (dataset.data.length === 0) {
                continue
            }

            const sourceId = dataset.id
            listenerApi.dispatch(actions.source.addSource(dataset))

            const layerId = nextId()
            listenerApi.dispatch(actions.layer.addLayer({
                id: layerId,
                sourceId,
                fractionIndex: 0,
                visible: true,
                name: dataset.name,
                color: "#1c7ed6",
            }))

            listenerApi.dispatch(actions.layer.setType({
                id: layerId,
                type: sourceToLayer.get(dataset.type),
            }))
        }
    },
});

export const addFilesMissleware = createListenerMiddleware();
addFilesMissleware.startListening({
    actionCreator: actions.source.addFiles,
    effect: async (_, listenerApi) => {
        const selected = await open({
            multiple: true,
            filters: [{
                name: 'Geospatial file',
                extensions: ['csv', 'geojson', 'gpx'],
            }]
        });
        if (!selected) {
            return
        }

        if (Array.isArray(selected)) {
            listenerApi.dispatch(actions.source.addFromFiles(selected))
        } else {
            listenerApi.dispatch(actions.source.addFromFiles([selected]))
        }
    },
});

export const addBlankLayerMiddleware = createListenerMiddleware();
addBlankLayerMiddleware.startListening({
    actionCreator: actions.layer.addBlankLayer,
    effect: async (action, listenerApi) => {
        const layerId = `${nextId()}`
        const name = "New Layer"
        listenerApi.dispatch(actions.layer.addLayer({
            id: layerId,
            fractionIndex: 0,
            visible: true,
            name,
            color: "#1c7ed6",
        }))
        listenerApi.dispatch(actions.selection.selectLayer({
            layerId,
        }))
    }
});

export const forceResizeMapMiddleware = createListenerMiddleware();
forceResizeMapMiddleware.startListening({
    matcher: isAnyOf(
        appSlice.actions.toggleZenMode,
        appSlice.actions.showLeftSidebar,
        appSlice.actions.hideLeftSidebar,
        appSlice.actions.showRightSidebar,
        appSlice.actions.hideRightSidebar,
        selectionSlice.actions.reset, // I'm not sure about this
    ),
    effect: async (_, listenerApi) => {
        const map = getMap("spheremap")
        if (!map) {
            return
        }

        // resize map in next tick
        await listenerApi.delay(0)

        map.resize()
    },
});

export const duplicateLayerMiddleware = createListenerMiddleware();
duplicateLayerMiddleware.startListening({
    actionCreator: duplicate,
    effect: async (action, listenerApi) => {
        const layerId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const layer = state.layer.items[layerId]

        listenerApi.dispatch(actions.layer.addLayer({
            ...layer,
            id: nextId(),
            name: layer.name + " copy",
            visible: true,
        }))
    },
});
