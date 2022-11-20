import { createAction, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { Dataset, Id } from '@/types'

// Define a type for the slice state
type SourceState = {
    items: Record<string, Dataset>
    allIds: Id[]
    lastAdded?: Id
}

// Define the initial state using that type
const initialState: SourceState = {
    items: {},
    allIds: [],
}

export const sourceSlice = createSlice({
    name: 'source',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        reset: state => {
            state.items = {}
            state.allIds = []
            state.lastAdded = undefined
        },
        addSource: (state, action: PayloadAction<Dataset>) => {
            const sourceId = action.payload.id
            state.items[sourceId] = action.payload
            state.allIds.push(sourceId)
            state.lastAdded = action.payload.id
        },
        removeSource: (state, action: PayloadAction<string>) => {
            const sourceId = action.payload
            delete state.items[sourceId]
            state.allIds = state.allIds.filter(id => id !== sourceId)
            if (state.lastAdded === sourceId) {
                state.lastAdded = undefined
            }
        },
    },
})

export const zoomTo = createAction<string>("source/zoomTo")
export const addFiles = createAction("source/addFiles")

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds

export default sourceSlice.reducer
