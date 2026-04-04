import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type DrawState = {
    sourceId?: Id
    selectedIds: number[]
}

const initialState: DrawState = {
    selectedIds: [],
}

export const drawSlice = createSlice({
    name: "draw",
    initialState,
    reducers: {
        start: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
            state.selectedIds = []
        },
        setSelectedIds: (state, action: PayloadAction<number[]>) => {
            state.selectedIds = action.payload
        },
        commit: (
            state,
            _: PayloadAction<{
                sourceId: Id
                patch: {
                    added: GeoJSON.Feature[]
                    updated: GeoJSON.Feature[]
                    deleted_ids: (string | number)[]
                }
            }>,
        ) => {
            return state
        },
        done: (state, _: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = undefined
            state.selectedIds = []
        },
        reset: state => {
            state.sourceId = undefined
            state.selectedIds = []
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
