import { createSlice } from '@reduxjs/toolkit'
import { RootState } from '.'

// Define a type for the slice state
type FogState = {
    show: boolean
}

// Define the initial state using that type
const initialState: FogState = {
    show: true
}

export const fogSlice = createSlice({
    name: 'fog',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        hide: state => {
            state.show = false
        },
        show: state => {
            state.show = true
        },
        toggle: state => {
            state.show = !state.show
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectIsShowFog = (state: RootState) => state.fog.show

export default fogSlice.reducer
