import { getMap } from "@/map"
import { createAction, createListenerMiddleware } from "@reduxjs/toolkit"
import mapboxgl from "mapbox-gl"

type WithMapId = {
    mapId: string
}

type FitBoundsPayload = WithMapId & {
    bounds: mapboxgl.LngLatBoundsLike
}
export const fitBounds = createAction<FitBoundsPayload>("map/fitBounds")

export const resetNorth = createAction<WithMapId>("map/resetNorth")
export const resize = createAction<string>("map/resize")
export const printViewport = createAction<WithMapId>("map/printViewport")

type ValuePayload<T> = {
    mapId: string
    value: T
}
export const setInteractive = createAction<ValuePayload<boolean>>("map/setInteractive")

export const actions = {
    fitBounds,
    resize,
    resetNorth,
    setInteractive,
    printViewport,
}

export const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: fitBounds,
    effect: async (action, listenerApi) => {
        const { mapId, bounds } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }
        map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 18,
            // maxDuration: 500,
        })
    },
})
listener.startListening({
    actionCreator: resize,
    effect: async (action, listenerApi) => {
        const mapId = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        map.resize()
    },
})
listener.startListening({
    actionCreator: resetNorth,
    effect: async (action, listenerApi) => {
        const { mapId } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        map.resetNorthPitch()
    },
})
listener.startListening({
    actionCreator: printViewport,
    effect: async (action, listenerApi) => {
        const { mapId } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        const viewport = {
            zoom: map.getZoom(),
            center: map.getCenter().toArray(),
            bbox: map.getBounds().toArray(),
        }

        console.log("viewport", viewport)
    },
})
