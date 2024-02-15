import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."
import { Style } from "mapbox-gl"
import { selectIsDrawing } from "./draw"
import { selectIsDark } from "./app"
// import type { RootState } from '../../app/store'

const VECTOR = "mapbox://styles/mapbox/streets-v9"
const SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12"
const OSM: Style = {
    name: "osm",
    version: 8,
    sources: {
        "osm-raster-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
        },
    },
    layers: [
        {
            id: "osm-raster-layer",
            type: "raster",
            source: "osm-raster-tiles",
            minzoom: 0,
            maxzoom: 22,
        },
    ],
}

type MapStyle = string | Style

// Define a type for the slice state
type MapStyleState = {
    value: MapStyle
}

// Define the initial state using that type
const initialState: MapStyleState = {
    value: OSM,
}

export const mapStyleSlice = createSlice({
    name: "mapStyle",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setVector: state => {
            state.value = VECTOR
        },
        setSatellite: state => {
            state.value = SATELLITE
        },
        setOsm: state => {
            state.value = OSM as any
        },
        // Use the PayloadAction type to declare the contents of `action.payload`
        setMapStyle: (state, action: PayloadAction<MapStyle>) => {
            state.value = action.payload as any
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectMapStyle = (state: RootState) => {
    const draw = selectIsDrawing(state)
    const dark = selectIsDark(state)

    if (draw) {
        return dark
            ? "mapbox://styles/mapbox/dark-v10"
            : "mapbox://styles/mapbox/light-v10"
    }

    return state.mapStyle.value
}

export default mapStyleSlice.reducer
