import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type SelectionState = {
    count: number
    version: number
    sourceId?: string
}

const initialState: SelectionState = {
    count: 0,
    version: 0,
}

export const selectionSlice = createSlice({
    name: "selection",
    initialState,
    reducers: {
        sync: (state, action: PayloadAction<{ count: number; sourceId?: string }>) => {
            state.count = action.payload.count
            state.version += 1
            state.sourceId = action.payload.sourceId
        },
        setSourceId: (state, action: PayloadAction<string | undefined>) => {
            state.sourceId = action.payload
        },
        reset: state => {
            state.count = 0
            state.version += 1
            state.sourceId = undefined
        },
        apply: () => {
            // No state change — signal for listeners to fetch properties
        },
    },
    selectors: {
        count: state => state.count,
        version: state => state.version,
        sourceId: state => state.sourceId,
    },
})

export default selectionSlice.reducer
