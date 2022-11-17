import { createSlice } from '@reduxjs/toolkit'
import { RootState } from '.'

// Define a type for the slice state
type ProjectionState = {
    value: string
}

// Define the initial state using that type
const initialState: ProjectionState = {
    value: "globe",
}

export const projectionSlice = createSlice({
    name: 'projection',
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
export const selectProjection = (state: RootState) => state.projection.value

export default projectionSlice.reducer
