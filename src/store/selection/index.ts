import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { SourceType } from '../../types'

// Define a type for the slice state
type SelectionState = {
    sourceId?: string
    selectedIds: number[]
}

// Define the initial state using that type
const initialState: SelectionState = {
    selectedIds: [],
}

export const selectionSlice = createSlice({
    name: 'selection',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        // reset: state => {
        //     state.items = {}
        //     state.allIds = []
        //     state.lastAdded = undefined
        // },
        // removeSource: (state, action: PayloadAction<string>) => {
        //     const sourceId = action.payload
        //     delete state.items[sourceId]
        //     state.allIds = state.allIds.filter(id => id !== sourceId)
        //     if (state.lastAdded === sourceId) {
        //         state.lastAdded = undefined
        //     }
        // },
        selectOne: (state, action: PayloadAction<{ sourceId: string, featureId: number }>) => {
            state.sourceId = action.payload.sourceId
            state.selectedIds = [action.payload.featureId]
        },
    },
    // extraReducers: (builder) => {
    //     builder
    //         .addCase(readFromFile.fulfilled, (state, action) => {
    //             const data = action.payload
    //             if (!data) {
    //                 return
    //             }

    //             for (const [type, source] of data) {
    //                 if (source.features.length === 0) {
    //                     break
    //                 }

    //                 const location = action.meta.arg
    //                 const sourceId = `${location}|${type}`
    //                 if (!(sourceId in state.items)) {
    //                     state.allIds.push(sourceId)
    //                 }
    //                 state.items[sourceId] = {
    //                     id: sourceId,
    //                     location,
    //                     data: source,
    //                     type,
    //                 }
    //                 state.lastAdded = sourceId
    //             }
    //         })
    // },
})

// Other code such as selectors can use the imported `RootState` type
// export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
// export const selectSourceIds = (state: RootState) => state.source.allIds

export default selectionSlice.reducer
