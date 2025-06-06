import type { TerrainSpecification } from "maplibre-gl"
import type { PayloadAction } from "@reduxjs/toolkit"
import { createSlice } from "@reduxjs/toolkit"
import { RootState } from "."

// Define a type for the slice state
type TerrainState = {
    show: boolean
    exaggeration: number
    source: string
}

// Define the initial state using that type
const initialState: TerrainState = {
    show: false,
    exaggeration: 1.5,
    source: "mapbox-dem",
}

export const terrainSlice = createSlice({
    name: "terrain",
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
        setExaggeration: (state, action: PayloadAction<number>) => {
            state.exaggeration = action.payload
        },
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectIsShowTerrain = (state: RootState) => state.terrain.show
export const selectExaggeration = (state: RootState) => state.terrain.exaggeration

export function selectTerrainSpecification(state: RootState): TerrainSpecification | null {
    if (!state.terrain.show) {
        return null
    }
    return {
        source: state.terrain.source,
        exaggeration: state.terrain.exaggeration,
    }
}

export default terrainSlice.reducer
