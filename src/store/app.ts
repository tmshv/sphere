import { createSlice } from '@reduxjs/toolkit'
import { RootState } from '.'

// Define a type for the slice state
type AppState = {
    zenMode: boolean
}

// Define the initial state using that type
const initialState: AppState = {
    zenMode: false
}

export const appSlice = createSlice({
    name: 'app',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        toggleZenMode: state => {
            state.zenMode = !state.zenMode
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectIsZen = (state: RootState) => state.app.zenMode

export default appSlice.reducer
