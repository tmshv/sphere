import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type DrawState = {
    sourceId?: Id
}

const initialState: DrawState = {}

export const drawSlice = createSlice({
    name: "draw",
    initialState,
    reducers: {
        start: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
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
