import { createSlice } from "@reduxjs/toolkit"
import { RootState } from "."
import { selectIsDrawing } from "./draw"

// Define a type for the slice state
type ProjectionState = {
    value: string
}

// Define the initial state using that type
const initialState: ProjectionState = {
    value: "globe",
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

// Other code such as selectors can use the imported `RootState` type
export const selectProjection = (state: RootState) => {
    const draw = selectIsDrawing(state)

    return draw
        ? "mercator"
        : state.projection.value
}

export const selectChangeProjectionAvailable = (state: RootState) => {
    return !selectIsDrawing(state)
}

export default projectionSlice.reducer
