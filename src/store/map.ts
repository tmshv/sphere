import { createAction } from '@reduxjs/toolkit'
import mapboxgl from 'mapbox-gl'

export type FitBoundsPayload = {
    mapId: string
    bounds: mapboxgl.LngLatBoundsLike
}
export const fitBounds = createAction<FitBoundsPayload>("map/fitBounds")
