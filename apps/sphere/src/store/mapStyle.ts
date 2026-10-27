import { EMPTY_STYLE } from "@/const"
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
    value: EMPTY_STYLE,
}

export const mapStyleSlice = createSlice({
    name: "mapStyle",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        // A MapLibre style loaded from a file
        setMapStyle: (state, action: PayloadAction<MapStyle>) => {
            state.value = castDraft(action.payload)
        },
    },
})

export const actions = mapStyleSlice.actions

export default mapStyleSlice.reducer
