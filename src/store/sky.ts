import { createSlice } from "@reduxjs/toolkit"
import { RootState } from "."

// Define a type for the slice state
export type SkyState = {
    show: boolean
}

// Define the initial state using that type
const initialState: SkyState = {
    show: true,
}

export const skySlice = createSlice({
    name: "sky",
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
export const selectIsShowSky = (state: RootState) => state.sky.show

export default skySlice.reducer
