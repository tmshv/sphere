import { createAction, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { addFromFile, addFromFiles } from "./add"
import { addFromUrl } from "./addFromUrl"
import { showProperties } from "./showProperties"
import { RootState } from ".."
import { drawSlice } from "../draw"
import { Id, SourceMetadata, SourceType } from "@/types"

type GeojsonSource = {
    type: SourceType.Geojson
    location: string
    dataset?: GeoJSON.FeatureCollection
    editable: false
    pending: false
}

type VectorSource = {
    type: SourceType.MVT
    location: string
    // layers:
    editable: false
    sourceLayers: { id: string, name: string }[]
    pending: false
}

type RasterSource = {
    type: SourceType.Raster
    location: string
    // layers:
    editable: false
    pending: false
}

type FeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    dataset: GeoJSON.FeatureCollection
    editable: false
    pending: false
    meta: SourceMetadata
}

type PendingFeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    dataset?: GeoJSON.FeatureCollection
    editable: true
    pending: true
}

type Source = (GeojsonSource | VectorSource | RasterSource | PendingFeatureCollecionSource | FeatureCollecionSource) & {
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
    name: "source",
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
            // dataset: GeoJSON.FeatureCollection,
            location?: string,
        }>) => {
            const { id: sourceId, name, location } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                type: SourceType.FeatureCollection,
                name,
                location,
                fractionIndex: 0,
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
        setData: (state, action: PayloadAction<{ id: Id, dataset: GeoJSON.FeatureCollection, meta: SourceMetadata }>) => {
            const { id, dataset, meta } = action.payload
            const source = state.items[id] as FeatureCollecionSource
            source.dataset = dataset
            source.meta = meta
            source.pending = false
        },
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
                pending: false,
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
                pending: false,
                fractionIndex: 0,
                editable: false,
            }
            state.allIds.push(sourceId)
            state.lastAdded = sourceId
        },
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
    extraReducers: builder => {
        builder
            .addCase(drawSlice.actions.stop, (state, action) => {
                const { sourceId: id, featureCollection } = action.payload
                const source = state.items[id]
                if (source.type === SourceType.FeatureCollection) {
                    source.dataset = featureCollection
                }
            })
    },
})

export const zoomTo = createAction<string>("source/zoomTo")

export const actions = {
    ...sourceSlice.actions,
    zoomTo,
    addFromFiles,
    addFromFile,
    addFromUrl,
    showProperties,
}

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
