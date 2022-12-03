import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "."
import { Id } from "@turf/helpers"

// Define a type for the slice state
type DrawState = {
    sourceId?: Id

    // tool:
}

// Define the initial state using that type
const initialState: DrawState = {
}

export const drawSlice = createSlice({
    name: "draw",
    initialState,
    reducers: {
        start: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
        },
        stop: (state, action: PayloadAction<{ sourceId: Id, featureCollection: GeoJSON.FeatureCollection }>) => {
            state.sourceId = undefined
        },
        cancel: state => {
            state.sourceId = undefined
        },
    },
})

export const actions = {
    ...drawSlice.actions,
}

export const selectIsDrawing = (state: RootState) => !!state.draw.sourceId
export const selectErrorMessage = (state: RootState) => state.error.message

export default drawSlice.reducer
