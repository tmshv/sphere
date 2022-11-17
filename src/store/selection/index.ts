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
export const selectProperties = (state: RootState) => {
    const sourceId = state.selection.sourceId
    if (!sourceId) {
        return null
    }

    const ids = state.selection.selectedIds
    const featureId = ids[0]

    const source = state.source.items[sourceId]
    if (!source) {
        return null
    }

    const feature = source.data.features.find(f => f.id === featureId)
    if (!feature) {
        return null
    }

    const props = feature.properties
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
