import { createSlice } from "@reduxjs/toolkit"
import type { Projection } from "@/types"

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

export default projectionSlice.reducer
