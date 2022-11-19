import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { actions, RootState } from '..'
import { DatasetRow, Id } from '@/types'

// Define a type for the slice state
type SelectionState = {
    layerId?: Id
    sourceId?: Id
    selectedIds: Id[]
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
        reset: state => {
            state.sourceId = undefined
            state.selectedIds = []
        },
        // removeSource: (state, action: PayloadAction<string>) => {
        //     const sourceId = action.payload
        //     delete state.items[sourceId]
        //     state.allIds = state.allIds.filter(id => id !== sourceId)
        //     if (state.lastAdded === sourceId) {
        //         state.lastAdded = undefined
        //     }
        // },
        selectSource: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
        },
        selectLayer: (state, action: PayloadAction<{ layerId: Id }>) => {
            state.layerId = action.payload.layerId
        },
        selectOne: (state, action: PayloadAction<{ sourceId: Id, featureId: Id }>) => {
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

export const selectCurrentSource = (state: RootState) => state.selection.sourceId
export const selectCurrentLayer = (state: RootState) => state.selection.layerId
export const selectProperties = (state: RootState) => {
    const sourceId = state.selection.sourceId
    if (!sourceId) {
        return null
    }

    const ids = state.selection.selectedIds
    const dataId = ids[0]

    const dataset = state.source.items[sourceId]
    if (!dataset) {
        return null
    }

    const row = dataset.data.find(f => f.id === dataId) as DatasetRow<any>
    if (!row) {
        return null
    }

    const props = row.data
    if (!props) {
        return null
    }

    const excludedKeys = new Set(["id"])

    return [...Object.entries(props)]
        .filter(([key, _]) => !excludedKeys.has(key))
        .map(([key, value]) => {
            return {
                key,
                value,
            }
        })
}

export default selectionSlice.reducer
