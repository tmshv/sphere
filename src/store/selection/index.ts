import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type SelectionState = {
    count: number
    version: number
}

const initialState: SelectionState = {
    count: 0,
    version: 0,
}

export const selectionSlice = createSlice({
    name: "selection",
    initialState,
    reducers: {
        sync: (state, action: PayloadAction<{ count: number }>) => {
            state.count = action.payload.count
            state.version += 1
        },
        reset: state => {
            state.count = 0
            state.version += 1
        },
        apply: () => {
            // No state change — signal for listeners to fetch properties
        },
    },
    selectors: {
        count: state => state.count,
        version: state => state.version,
    },
})

export default selectionSlice.reducer
