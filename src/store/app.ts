import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."

// Define a type for the slice state
type AppState = {
    version: string
    zenMode: boolean
    darkTheme: boolean
    showAttribution: boolean
    showLeftSidebar: boolean
    showRightSidebar: boolean
}

// Define the initial state using that type
const initialState: AppState = {
    version: "",
    zenMode: false,
    darkTheme: false,
    showAttribution: false,
    showLeftSidebar: true,
    showRightSidebar: true,
}

export const appSlice = createSlice({
    name: "app",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setVersion: (state, action: PayloadAction<string>) => {
            state.version = action.payload
        },
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
    selectors: {
        isZen: state => state.zenMode,
        isDark: state => state.darkTheme,
    },
})

export const actions = {
    ...appSlice.actions,
}

// Other code such as selectors can use the imported `RootState` type
export const selectShowAttribution = (state: RootState) => state.app.showAttribution
export const selectShowLeftSidebar = (state: RootState) => state.app.showLeftSidebar && !state.app.zenMode
export const selectShowRightSidebar = (state: RootState) => state.app.showRightSidebar
export const selectVersion = (state: RootState) => state.app.version

export default appSlice.reducer
