import { isCreationMode } from "@/lib/draw-mode"
import type { DrawActionable, DrawFeatureId, DrawToolbarAction, Id } from "@/types"
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
    // The mode of the draw control (`simple_select`, `draw_polygon`, …), once it reported a change
    mode?: string
    // Which of draw's actions (delete, combine, uncombine) apply to the control's mode and selection
    actionable: DrawActionable
}

const NOTHING_ACTIONABLE: DrawActionable = { trash: false, combineFeatures: false, uncombineFeatures: false }

const initialState: DrawState = {
    pending: false,
    hiddenIds: [],
    actionable: NOTHING_ACTIONABLE,
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
            state.mode = undefined
            state.actionable = NOTHING_ACTIONABLE
        },
        /** The backend ids now loaded into draw, reported by the working-set loader after each load. */
        setHiddenIds: (state, action: PayloadAction<{ sourceId: Id; ids: number[] }>) => {
            if (state.sourceId === action.payload.sourceId) {
                state.hiddenIds = action.payload.ids
            }
        },
        /** The draw control of the drawn source changed its mode. */
        modeChanged: (state, action: PayloadAction<{ sourceId: Id; mode: string }>) => {
            if (state.sourceId === action.payload.sourceId) {
                state.mode = action.payload.mode
            }
        },
        /** The draw control of the drawn source changed which of its actions apply. */
        actionableChanged: (state, action: PayloadAction<{ sourceId: Id; actionable: DrawActionable }>) => {
            if (state.sourceId === action.payload.sourceId) {
                state.actionable = action.payload.actionable
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
            state.mode = undefined
            state.actionable = NOTHING_ACTIONABLE
        },
        reset: state => {
            state.sourceId = undefined
            state.pending = false
            state.hiddenIds = []
            state.mode = undefined
            state.actionable = NOTHING_ACTIONABLE
        },
    },
    selectors: {
        isDrawing: state => !!state.sourceId,
        isPending: state => state.pending,
        sourceId: state => state.sourceId,
        hiddenIds: state => state.hiddenIds,
        mode: state => state.mode,
        actionable: state => state.actionable,
        // Draw is placing the vertices of a new feature: a drag between its clicks is draw's, not a rectangle
        isCreating: state => isCreationMode(state.mode),
    },
})

/** The user changed draw's feature selection; the draw-selection listener mirrors it to the backend. */
const selectionChanged = createAction<{ sourceId: Id; ids: DrawFeatureId[] }>("draw/selectionChanged")

/** A press on the draw toolbar; the draw-toolbar listener runs it on the drawn source's control. */
const toolbar = createAction<{ sourceId: Id; action: DrawToolbarAction }>("draw/toolbar")

export const actions = {
    ...drawSlice.actions,
    selectionChanged,
    toolbar,
}

export default drawSlice.reducer
