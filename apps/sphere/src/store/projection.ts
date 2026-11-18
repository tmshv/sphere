import { projectionCrs } from "@/lib/projection"
import type { Projection } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "."

// Define a type for the slice state
type ProjectionState = {
    value: Projection
}

// Define the initial state using that type
const initialState: ProjectionState = {
    value: "mercator",
}

export const projectionSlice = createSlice({
    name: "projection",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setGlobe: state => {
            state.value = "globe"
        },
        setFlat: state => {
            state.value = "mercator"
        },
    },
})

// The CRS tiles are cut in under the active projection; raster URL templates must match it
export const selectProjectionCrs = (state: RootState) => projectionCrs(state.projection.value)

export default projectionSlice.reducer
