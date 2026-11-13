import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type DrawState = {
    // The source being drawn; set only once the backend session has begun
    sourceId?: Id
    // A begin, commit or rollback is in flight; the draw UI blocks input meanwhile
    pending: boolean
}

const initialState: DrawState = {
    pending: false,
}

function isIdle(state: DrawState) {
    return state.sourceId === undefined && !state.pending
}

function isDrawingSource(state: DrawState, sourceId: Id) {
    return state.sourceId === sourceId && !state.pending
}

export const drawSlice = createSlice({
    name: "draw",
    initialState,
    reducers: {
        /** Request to draw on a source. The start-draw listener begins the backend session. */
        start: (state, _: PayloadAction<{ sourceId: Id }>) => {
            if (isIdle(state)) {
                state.pending = true
            }
        },
        /** The backend session has begun: enter draw mode. */
        started: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
            state.pending = false
        },
        /** Request to keep the edits. Handled by the save-draw listener. */
        commit: (state, action: PayloadAction<{ sourceId: Id }>) => {
            if (isDrawingSource(state, action.payload.sourceId)) {
                state.pending = true
            }
        },
        /** Request to discard the edits. Handled by the save-draw listener. */
        cancel: (state, action: PayloadAction<{ sourceId: Id }>) => {
            if (isDrawingSource(state, action.payload.sourceId)) {
                state.pending = true
            }
        },
        /** A begin, commit or rollback failed: nothing changed, the mode stays as it was. */
        settle: state => {
            state.pending = false
        },
        /** A draw error from the map (edit or load). The save-draw listener surfaces it. */
        failed: (state, _: PayloadAction<string>) => {
            return state
        },
        done: (state, _: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = undefined
            state.pending = false
        },
        reset: state => {
            state.sourceId = undefined
            state.pending = false
        },
    },
    selectors: {
        isDrawing: state => !!state.sourceId,
        isPending: state => state.pending,
        sourceId: state => state.sourceId,
    },
})

export const actions = {
    ...drawSlice.actions,
}

export default drawSlice.reducer
