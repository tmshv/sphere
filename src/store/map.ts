import { createAction } from '@reduxjs/toolkit'
import mapboxgl from 'mapbox-gl'

type FitBoundsPayload = {
    mapId: string
    bounds: mapboxgl.LngLatBoundsLike
}
export const fitBounds = createAction<FitBoundsPayload>("map/fitBounds")

export const resize = createAction<string>("map/resize")

type ValuePayload<T> = {
    mapId: string
    value: T
}
export const setInteractive = createAction<ValuePayload<boolean>>("map/setInteractive")

export const actions = {
    fitBounds,
    resize,
    setInteractive,
}
