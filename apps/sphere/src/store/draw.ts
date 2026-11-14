import type { DrawFeatureId, Id } from "@/types"
import { createAction, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type DrawState = {
    // The source being drawn; set only once the backend session has begun
    sourceId?: Id
    // A begin, commit or rollback is in flight; the draw UI blocks input meanwhile
    pending: boolean
    // Backend ids of the features loaded into draw (edited and deleted ones included). The draw
    // context layer hides them, so the pre-session copy of the source never shows under the edit.
    // Ids only, never GeoJSON; at most the working set cap plus the features edited this session
    hiddenIds: number[]
}

const initialState: DrawState = {
    pending: false,
    hiddenIds: [],
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
            state.hiddenIds = []
        },
        /** The backend ids now loaded into draw, reported by the working-set loader after each load. */
        setHiddenIds: (state, action: PayloadAction<{ sourceId: Id; ids: number[] }>) => {
            if (state.sourceId === action.payload.sourceId) {
                state.hiddenIds = action.payload.ids
            }
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
            if (state.sourceId === undefined) {
                state.hiddenIds = []
            }
        },
        /** A draw error from the map (edit or load). The save-draw listener surfaces it. */
        failed: (state, _: PayloadAction<string>) => {
            return state
        },
        // done comes after a commit that changed the source asked for its re-fetch (bumpVersion); reset
        // after a rollback, which needs none: the map's copy of the source is still the pre-session one
        done: (state, _: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = undefined
            state.pending = false
            state.hiddenIds = []
        },
        reset: state => {
            state.sourceId = undefined
            state.pending = false
            state.hiddenIds = []
        },
    },
    selectors: {
        isDrawing: state => !!state.sourceId,
        isPending: state => state.pending,
        sourceId: state => state.sourceId,
        hiddenIds: state => state.hiddenIds,
    },
})

/** The user changed draw's feature selection; the draw-selection listener mirrors it to the backend. */
const selectionChanged = createAction<{ sourceId: Id; ids: DrawFeatureId[] }>("draw/selectionChanged")

export const actions = {
    ...drawSlice.actions,
    selectionChanged,
}

export default drawSlice.reducer
