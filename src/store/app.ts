import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '.'

// Define a type for the slice state
type AppState = {
    zenMode: boolean
    darkTheme: boolean
    showLeftSidebar: boolean
    showRightSidebar: boolean
}

// Define the initial state using that type
const initialState: AppState = {
    zenMode: false,
    darkTheme: false,
    showLeftSidebar: true,
    showRightSidebar: true,
}

export const appSlice = createSlice({
    name: 'app',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        toggleZenMode: state => {
            state.zenMode = !state.zenMode
        },
        toggleDarkTheme: state => {
            state.darkTheme = !state.darkTheme
        },
        setDarkTheme: (state, action: PayloadAction<boolean>) => {
            state.darkTheme = action.payload
        },
        showLeftSidebar: state => {
            state.showLeftSidebar = true
        },
        hideLeftSidebar: state => {
            state.showLeftSidebar = false
        },
        showRightSidebar: state => {
            state.showRightSidebar = true
        },
        hideRightSidebar: state => {
            state.showRightSidebar = false
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectIsZen = (state: RootState) => state.app.zenMode
export const selectIsDark = (state: RootState) => state.app.darkTheme
export const selectShowLeftSidebar = (state: RootState) => state.app.showLeftSidebar
export const selectShowRightSidebar = (state: RootState) => state.app.showRightSidebar

export default appSlice.reducer
