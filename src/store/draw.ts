import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

// Define a type for the slice state
type DrawState = {
    sourceId?: Id

    // tool:
}

// Define the initial state using that type
const initialState: DrawState = {}

export const drawSlice = createSlice({
    name: "draw",
    initialState,
    reducers: {
        start: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
        },
        commit: (state, _: PayloadAction<{ sourceId: Id; data: GeoJSON.FeatureCollection }>) => {
            // trigger action — listener handles the side effects
            return state
        },
        done: (state, _: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = undefined
        },
        reset: state => {
            state.sourceId = undefined
        },
    },
    selectors: {
        isDrawing: state => !!state.sourceId,
    },
})

export const actions = {
    ...drawSlice.actions,
}

export default drawSlice.reducer
