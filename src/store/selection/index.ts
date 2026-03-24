import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."

// Define a type for the slice state
type SelectionState = {
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
            state.selectedIds = []
        },
        resetFeature: state => {
            state.selectedIds = []
        },
        selectOne: (state, action: PayloadAction<{ layerId: Id; featureId: number }>) => {
            state.selectedIds = [action.payload.featureId]
        },
    },
})

export default selectionSlice.reducer
