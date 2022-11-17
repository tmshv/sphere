import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { readFromFile } from './readFromFile'
import { SourceType } from '../../types'

type Source = {
    id: string
    location: string
    type: SourceType
    data: GeoJSON.FeatureCollection
}

// Define a type for the slice state
type SourceState = {
    items: Record<string, Source>
    allIds: string[]
    lastAdded?: string
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
        removeSource: (state, action: PayloadAction<string>) => {
            const sourceId = action.payload
            delete state.items[sourceId]
            state.allIds = state.allIds.filter(id => id !== sourceId)
            if (state.lastAdded === sourceId) {
                state.lastAdded = undefined
            }
        },
        // addSource: (state, action: PayloadAction<Source>) => {
        //     const sourceId = action.payload.id
        //     state.items[sourceId] = action.payload
        //     state.allIds.push(sourceId)
        //     state.lastAdded = action.payload.id
        // },
    },
    extraReducers: (builder) => {
        // Add reducers for additional action types here, and handle loading state as needed
        builder.addCase(readFromFile.fulfilled, (state, action) => {
            const data = action.payload
            if (!data) {
                return
            }

            for (const [type, source] of data) {
                const location = action.meta.arg
                const sourceId = `${location}|${type}`
                state.items[sourceId] = {
                    id: sourceId,
                    location,
                    data: source,
                    type,
                }
                state.allIds.push(sourceId)
                state.lastAdded = sourceId
            }
            state.allIds = Array.from(new Set(state.allIds))
        })
    },
})

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds

export default sourceSlice.reducer
