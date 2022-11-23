import { createAction, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { addFromFile, addFromUrl, addFromFiles, } from './add'
import { RootState } from '..'
import { Dataset, Id } from '@/types'
import { nextId } from '@/lib/nextId'

type SourceStatus = 'init' | 'loading' | 'done' | 'failed'

type Source = {
    id: Id
    name: string
    location: string
    dataset: Dataset<any>
    fractionIndex: number
    status: SourceStatus
}

// type PendingSource = {
//     id: Id
//     name: string
//     status: LoadingStatus
// }

// Define a type for the slice state
type SourceState = {
    items: Record<string, Source>
    allIds: Id[]
    lastAdded?: Id
    // pendingItems: PendingSource[]
}

// Define the initial state using that type
const initialState: SourceState = {
    items: {},
    allIds: [],
    // pendingItems: [],
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
        addSource: (state, action: PayloadAction<{ id: Id, name: string, location: string, dataset: Dataset<any>}>) => {
            const {id: sourceId, name, location, dataset} = action.payload
            state.items[sourceId] = {
                id: sourceId,
                name,
                location,
                dataset,
                fractionIndex: 0,
                status: "init",
            }
            state.allIds.push(sourceId)
            state.lastAdded = sourceId
        },
        // addFromUrl: (state, action: PayloadAction<{ url: string }>) => {
        //     const sourceId = nextId("source")
        //     state.items[sourceId] = {
        //         id: sourceId,
        //         // name,
        //         location: action.payload.url,
        //         // dataset,
        //         fractionIndex: 0,
        //         status: "init",
        //     }
        //     state.allIds.push(sourceId)
        //     state.lastAdded = sourceId
        // },
        removeSource: (state, action: PayloadAction<string>) => {
            const sourceId = action.payload
            delete state.items[sourceId]
            state.allIds = state.allIds.filter(id => id !== sourceId)
            if (state.lastAdded === sourceId) {
                state.lastAdded = undefined
            }
        },
        setName: (state, action: PayloadAction<{ id: Id, value: string }>) => {
            const { id: sourceId, value } = action.payload
            state.items[sourceId].name = value
        },
    },
})

export const zoomTo = createAction<string>("source/zoomTo")
export const addFiles = createAction("source/addFiles")

export const actions = {
    ...sourceSlice.actions,
    zoomTo,
    addFiles,
    addFromFiles,
    addFromFile,
    addFromUrl,
}

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
