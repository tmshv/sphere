import { createAction, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import addFromUrl from "./addFromUrl"
import reload from "./reload"
import empty from "./empty"
import { showProperties } from "./showProperties"
import type { RootState } from ".."
import { drawSlice } from "../draw"
import { Id, SourceMetadata, SourceType } from "@/types"
import type { TileJSON } from "@/types/tilejson"
import type { FeatureCollecionSource, GeojsonMetadata, GeojsonSource, Source } from "@/types/source"

const NEW_SOURCE_INDEX = 0 // Will be at the top of the list

function computeGeometryMeta(fc: GeoJSON.FeatureCollection): SourceMetadata {
    let pointsCount = 0
    let linesCount = 0
    let polygonsCount = 0
    for (const feature of fc.features) {
        const t = feature.geometry?.type
        if (t === "Point" || t === "MultiPoint") pointsCount++
        else if (t === "LineString" || t === "MultiLineString") linesCount++
        else if (t === "Polygon" || t === "MultiPolygon") polygonsCount++
    }
    return { pointsCount, linesCount, polygonsCount }
}

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
        addFeatureCollection: (state, action: PayloadAction<{
            id: Id,
            name: string,
            dataset: GeoJSON.FeatureCollection,
        }>) => {
            const { id: sourceId, name, dataset } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                type: SourceType.FeatureCollection,
                name,
                dataset,
                fractionIndex: NEW_SOURCE_INDEX,
                pending: false,
                editable: true,
                meta: {
                    pointsCount: 0,
                    linesCount: 0,
                    polygonsCount: 0,
                },
            }
            state.allIds.push(sourceId)
            state.lastAdded = sourceId
        },
        setData: (state, action: PayloadAction<{ id: Id, dataset: GeoJSON.FeatureCollection, meta: SourceMetadata }>) => {
            const { id, dataset, meta } = action.payload
            const source = state.items[id] as FeatureCollecionSource
            source.dataset = dataset
            source.meta = meta
            source.pending = false
        },
        addGeojsonSource: (state, action: PayloadAction<{
            id: Id,
            name: string,
            location: string,
            metadata: GeojsonMetadata,
            meta: SourceMetadata,
            dataset?: GeoJSON.FeatureCollection,
        }>) => {
            const { id, name, location, metadata, meta, dataset } = action.payload
            state.items[id] = {
                id,
                name,
                location,
                type: SourceType.Geojson,
                pending: false,
                fractionIndex: NEW_SOURCE_INDEX,
                editable: true,
                metadata,
                meta,
                dataset,
            }
            state.allIds.push(id)
            state.lastAdded = id
        },
        setGeojsonData: (state, action: PayloadAction<{
            id: Id,
            metadata?: GeojsonMetadata,
            meta?: SourceMetadata,
            dataset?: GeoJSON.FeatureCollection,
        }>) => {
            const { id, metadata, meta, dataset } = action.payload
            const s = state.items[id] as GeojsonSource
            if (metadata) {
                s.metadata = metadata
            }
            if (meta) {
                s.meta = meta
            }
            if (dataset) {
                s.dataset = dataset
            }
        },
        addMVTSource: (state, action: PayloadAction<{
            id: Id,
            name: string,
            location: string,
            tilejson: TileJSON,
            sourceLayers?: { name: string, id: string }[],
        }>) => {
            const { id, name, location, tilejson, sourceLayers } = action.payload
            state.items[id] = {
                id,
                name,
                location,
                type: SourceType.MVT,
                pending: false,
                fractionIndex: NEW_SOURCE_INDEX,
                editable: false,
                tilejson,
                sourceLayers: sourceLayers ?? [],
            }
            state.allIds.push(id)
            state.lastAdded = id
        },
        addRasterSource: (state, action: PayloadAction<{
            id: Id,
            name: string,
            location: string,
            sourceLayers?: { name: string, id: string }[],
            metadata?: TileJSON | GeojsonMetadata,
        }>) => {
            const { id: sourceId, name, location } = action.payload
            state.items[sourceId] = {
                id: sourceId,
                name,
                location,
                type: SourceType.Raster,
                pending: false,
                fractionIndex: NEW_SOURCE_INDEX,
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
            .addCase(drawSlice.actions.done, (state, action) => {
                const { sourceId: id, featureCollection } = action.payload
                const source = state.items[id]
                if (source.type === SourceType.FeatureCollection) {
                    source.dataset = featureCollection
                    source.meta = computeGeometryMeta(featureCollection)
                }
                if (source.type === SourceType.Geojson) {
                    source.dataset = featureCollection
                    source.meta = computeGeometryMeta(featureCollection)
                }
            })
    },
    selectors: {
        allIds: state => state.allIds,
        items: state => state.items,
    },
})

export const zoomTo = createAction<string>("source/zoomTo")

export const actions = {
    ...sourceSlice.actions,
    zoomTo,
    addFromUrl,
    showProperties,
    reload,
    empty,
}

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
