import { createAction, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { addFromFile, addFromFiles, } from './add'
import { addFromUrl } from './addFromUrl'
import { RootState } from '..'
import { Id, SourceType } from '@/types'
import { featureCollection } from '@turf/helpers'

type SourceStatus = 'init' | 'loading' | 'done' | 'failed'

type GeojsonSource = {
    type: SourceType.Geojson
    location: string
    dataset?: GeoJSON.FeatureCollection
    editable: false
}

type VectorSource = {
    type: SourceType.MVT
    location: string
    // layers: 
    editable: false
    sourceLayers: { id: string, name: string }[]
}

type RasterSource = {
    type: SourceType.Raster
    location: string
    // layers: 
    editable: false
}

type FeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    dataset: GeoJSON.FeatureCollection
    editable: true
    pending: boolean
}

type Source = (GeojsonSource | VectorSource | RasterSource | FeatureCollecionSource) & {
    id: Id
    name: string
    fractionIndex: number
    error?: string
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
        // addFeatureCollection: (state, action: PayloadAction<{ id: Id, name: string, location?: string, dataset: GeoJSON.FeatureCollection }>) => {
        //     const { id: sourceId, name, location, dataset } = action.payload
        //     state.items[sourceId] = {
        //         id: sourceId,
        //         type: SourceType.FeatureCollection,
        //         name,
        //         location: location ?? "<unknown>",
        //         dataset,
        //         fractionIndex: 0,
        //         // status: "init",
        //         pending: false,
        //         editable: true,
        //     }
        //     state.allIds.push(sourceId)
        //     state.lastAdded = sourceId
        // },
        addFeatureCollection: (state, action: PayloadAction<{
            id: Id,
            name: string,
            dataset: GeoJSON.FeatureCollection,
            location?: string,
        }>) => {
            const { id: sourceId, name, location, dataset } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                type: SourceType.FeatureCollection,
                name,
                location,
                dataset,
                // dataset: featureCollection([]),
                fractionIndex: 0,
                // status: "init",
                pending: true,
                editable: true,
            }
            state.allIds.push(sourceId)
            state.lastAdded = sourceId
        },
        // createFeatureCollection: (state, action: PayloadAction<{
        //     id: Id,
        //     name: string,
        //     location: string,
        //     dataset: GeoJSON.FeatureCollection,
        // }>) => {
        //     const { id: sourceId, name, location, dataset } = action.payload
        //     state.items[sourceId] = {
        //         id: sourceId,
        //         type: SourceType.FeatureCollection,
        //         name,
        //         location,
        //         dataset,
        //         fractionIndex: 0,
        //         // status: "init",
        //         pending: false,
        //         editable: true,
        //     }
        //     state.allIds.push(sourceId)
        //     state.lastAdded = sourceId
        // },
        // setData: (state, action: PayloadAction<{ id: Id, dataset: GeoJSON.FeatureCollection }>) => {
        //     const { id, dataset } = action.payload
        //     state.items[id].dataset = dataset
        // },
        addVector: (state, action: PayloadAction<{
            id: Id,
            name: string,
            sourceLayers: { name: string, id: string }[],
            location: string,
        }>) => {
            const { id: sourceId, sourceLayers, name, location } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                type: SourceType.MVT,
                name,
                location,
                fractionIndex: 0,
                // status: "init",
                editable: false,
                sourceLayers,
            }
            state.allIds.push(sourceId)
            state.lastAdded = sourceId
        },
        addRemote: (state, action: PayloadAction<{
            id: Id,
            type: SourceType.Geojson | SourceType.Raster,
            name: string,
            location: string,
        }>) => {
            const { id: sourceId, type, name, location } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                type,
                name,
                location,
                fractionIndex: 0,
                // status: "init",
                pending: false,
                editable: false,
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

export const actions = {
    ...sourceSlice.actions,
    zoomTo,
    addFromFiles,
    addFromFile,
    addFromUrl,
}

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
