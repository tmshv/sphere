import type { ColumnStats, FileInfo, FormatDetails, SourceInfo } from "@/lib/source-reader"
import type { Id } from "@/types"
import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type LoadStatus = "pending" | "ready" | "error"

export type InfoEntry = {
    status: LoadStatus
    file?: FileInfo | null
    details?: FormatDetails
}

export type StatsEntry = {
    status: LoadStatus
    data?: ColumnStats
}

type SourceInfoState = {
    info: Record<Id, InfoEntry>
    stats: Record<Id, Record<string, StatsEntry>>
}

const initialState: SourceInfoState = {
    info: {},
    stats: {},
}

export const sourceInfoSlice = createSlice({
    name: "sourceInfo",
    initialState,
    reducers: {
        infoRequested: (state, action: PayloadAction<Id>) => {
            state.info[action.payload] = { status: "pending" }
        },
        infoReceived: (state, action: PayloadAction<{ id: Id; info: SourceInfo }>) => {
            const { id, info } = action.payload
            state.info[id] = {
                status: "ready",
                file: info.file,
                details: info.details,
            }
        },
        infoFailed: (state, action: PayloadAction<Id>) => {
            state.info[action.payload] = { status: "error" }
        },
        statsRequested: (state, action: PayloadAction<{ id: Id; column: string }>) => {
            const { id, column } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "pending" }
            state.stats[id] = bySource
        },
        statsReceived: (state, action: PayloadAction<{ id: Id; column: string; stats: ColumnStats }>) => {
            const { id, column, stats } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "ready", data: stats }
            state.stats[id] = bySource
        },
        statsFailed: (state, action: PayloadAction<{ id: Id; column: string }>) => {
            const { id, column } = action.payload
            const bySource = state.stats[id] ?? {}
            bySource[column] = { status: "error" }
            state.stats[id] = bySource
        },
        invalidate: (state, action: PayloadAction<Id>) => {
            const id = action.payload
            delete state.info[id]
            delete state.stats[id]
        },
    },
    selectors: {
        info: state => state.info,
        stats: state => state.stats,
    },
})

export const actions = sourceInfoSlice.actions

export default sourceInfoSlice.reducer
