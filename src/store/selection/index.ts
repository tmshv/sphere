import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

// Define a type for the slice state
type SelectionState = {
    layerId?: Id
    sourceId?: Id
    selectedIds: number[]
}

// Define the initial state using that type
const initialState: SelectionState = {
    selectedIds: [],
}

export const selectionSlice = createSlice({
    name: "selection",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        reset: state => {
            state.layerId = undefined
            state.sourceId = undefined
            state.selectedIds = []
        },
        resetFeature: state => {
            state.selectedIds = []
        },
        selectOne: (state, action: PayloadAction<{ layerId: Id; featureId: number }>) => {
            state.layerId = action.payload.layerId
            state.sourceId = undefined
            state.selectedIds = [action.payload.featureId]
        },
        selectMany: (state, action: PayloadAction<{ sourceId: Id; featureIds: number[] }>) => {
            state.sourceId = action.payload.sourceId
            state.layerId = undefined
            state.selectedIds = action.payload.featureIds
        },
    },
    selectors: {
        currentLayerId: state => state.layerId,
        currentSourceId: state => state.sourceId,
    },
})

export default selectionSlice.reducer
