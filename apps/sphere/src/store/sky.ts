import { createSlice } from "@reduxjs/toolkit"
import type { SkySpecification } from "maplibre-gl"
import type { RootState } from "."

// Define a type for the slice state
export type SkyState = {
    show: boolean
    spec: SkySpecification
}

// Define the initial state using that type
const initialState: SkyState = {
    show: true,
    spec: {
        "sky-color": "#0d7fca",
        "sky-horizon-blend": 0.5,
        "horizon-color": "#abf8ff",
        "horizon-fog-blend": 0.5,
        "fog-color": "#545669",
        "fog-ground-blend": 0,
    },
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

export function selectSkySpecification(state: RootState): SkySpecification | undefined {
    if (!state.sky.show) {
        return undefined
    }
    return state.sky.spec
}

export default skySlice.reducer
