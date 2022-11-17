import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '.'
// import type { RootState } from '../../app/store'



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
        // increment: (state) => {
        //     state.value += 1
        // },
        // decrement: (state) => {
        //     state.value -= 1
        // },
        // // Use the PayloadAction type to declare the contents of `action.payload`
        // incrementByAmount: (state, action: PayloadAction<number>) => {
        //     state.value += action.payload
        // },
    },
})

// export const { increment, decrement, incrementByAmount } = projectionSlice.actions
export const { setGlobe, setFlat } = projectionSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectProjection = (state: RootState) => state.projection.value

export default projectionSlice.reducer
