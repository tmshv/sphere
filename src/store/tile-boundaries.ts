import { createSlice } from "@reduxjs/toolkit"

type TileBoundariesState = {
    value: boolean
}

const initialState: TileBoundariesState = {
    value: false,
}

export const tileBoundariesSlice = createSlice({
    name: "tileBoundaries",
    initialState,
    reducers: {
        enable: state => {
            state.value = true
        },
        disable: state => {
            state.value = false
        },
        toggle: state => {
            state.value = !state.value
        },
    },
})

export default tileBoundariesSlice.reducer
