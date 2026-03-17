import { STYLE_OSM, STYLE_SATELLITE, STYLE_VECTOR } from "@/const"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { castDraft } from "immer"
import type { StyleSpecification } from "maplibre-gl"

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
            state.value = castDraft(STYLE_OSM)
        },
        // Use the PayloadAction type to declare the contents of `action.payload`
        setMapStyle: (state, action: PayloadAction<MapStyle>) => {
            state.value = castDraft(action.payload)
        },
    },
})

export const actions = mapStyleSlice.actions

export default mapStyleSlice.reducer
