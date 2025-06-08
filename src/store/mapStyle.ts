import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { StyleSpecification } from "maplibre-gl"
import { STYLE_OSM, STYLE_VECTOR, STYLE_SATELLITE } from "@/const"

type MapStyle = string | StyleSpecification

// Define a type for the slice state
type MapStyleState = {
    value: MapStyle
}

// Define the initial state using that type
const initialState: MapStyleState = {
    value: STYLE_OSM,
}

export const mapStyleSlice = createSlice({
    name: "mapStyle",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setVector: state => {
            state.value = STYLE_VECTOR
        },
        setSatellite: state => {
            state.value = STYLE_SATELLITE
        },
        setOsm: state => {
            state.value = STYLE_OSM as any
        },
        // Use the PayloadAction type to declare the contents of `action.payload`
        setMapStyle: (state, action: PayloadAction<MapStyle>) => {
            state.value = action.payload as any
        },
    },
})

export const actions = mapStyleSlice.actions

export default mapStyleSlice.reducer
