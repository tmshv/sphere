import { type Id, type SourceMetadata, SourceType } from "@/types"
import type { Source } from "@/types/source"
import type { TileJSON } from "@/types/tilejson"
import { createAction, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."
import addFromClipboard from "./addFromClipboard"
import addFromUrl from "./addFromUrl"
import newSource from "./new"
import reload from "./reload"
import { showProperties } from "./showProperties"

const NEW_SOURCE_INDEX = 0 // Will be at the top of the list

export function computeGeometryMeta(
    fc: GeoJSON.FeatureCollection,
    columns: Record<string, string> = {},
): SourceMetadata {
    let pointsCount = 0
    let linesCount = 0
    let polygonsCount = 0
    for (const feature of fc.features) {
        const t = feature.geometry?.type
        if (t === "Point" || t === "MultiPoint") pointsCount++
        else if (t === "LineString" || t === "MultiLineString") linesCount++
        else if (t === "Polygon" || t === "MultiPolygon") polygonsCount++
    }
    return { columns, pointsCount, linesCount, polygonsCount }
}

// Define a type for the slice state
type SourceState = {
    items: Record<string, Source>
    allIds: Id[]
    lastAdded?: Id
    selectedId?: Id
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
            state.selectedId = undefined
        },
        addInMemorySource: (
            state,
            action: PayloadAction<{
                id: Id
                name: string
                location: string
                meta: SourceMetadata
            }>,
        ) => {
            const { id, name, location, meta } = action.payload
            state.items[id] = {
                id,
                type: SourceType.FeatureCollection,
                name,
                location,
                version: 0,
                fractionIndex: NEW_SOURCE_INDEX,
                pending: false,
                editable: true,
                meta,
            }
            state.allIds.push(id)
            state.lastAdded = id
        },
        bumpVersion: (state, action: PayloadAction<Id>) => {
            const source = state.items[action.payload]
            if (!source || source.type !== SourceType.FeatureCollection || source.pending) return
            source.version++
        },
        addGeojsonSource: (
            state,
            action: PayloadAction<{
                id: Id
                name: string
                location: string
                meta: SourceMetadata
            }>,
        ) => {
            const { id, name, location, meta } = action.payload
            state.items[id] = {
                id,
                name,
                location,
                type: SourceType.Geojson,
                pending: false,
                fractionIndex: NEW_SOURCE_INDEX,
                editable: false,
                meta,
            }
            state.allIds.push(id)
            state.lastAdded = id
        },
        addMVTSource: (
            state,
            action: PayloadAction<{
                id: Id
                name: string
                location: string
                tilejson: TileJSON
                format: "pbf" | "png" | "jpg" | "webp"
                sourceLayers?: { name: string; id: string }[]
            }>,
        ) => {
            const { id, name, location, tilejson, format, sourceLayers } = action.payload
            state.items[id] = {
                id,
                name,
                location,
                type: SourceType.MVT,
                pending: false,
                fractionIndex: NEW_SOURCE_INDEX,
                editable: false,
                tilejson,
                format,
                sourceLayers: sourceLayers ?? [],
            }
            state.allIds.push(id)
            state.lastAdded = id
        },
        addRasterSource: (
            state,
            action: PayloadAction<{
                id: Id
                name: string
                location: string
                sourceLayers?: { name: string; id: string }[]
            }>,
        ) => {
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
        select: (state, action: PayloadAction<Id | undefined>) => {
            state.selectedId = action.payload
        },
        removeSource: (state, action: PayloadAction<string>) => {
            const sourceId = action.payload
            delete state.items[sourceId]
            state.allIds = state.allIds.filter(id => id !== sourceId)
            if (state.lastAdded === sourceId) {
                state.lastAdded = undefined
            }
            if (state.selectedId === sourceId) {
                state.selectedId = undefined
            }
        },
        setName: (state, action: PayloadAction<{ id: Id; value: string }>) => {
            const { id: sourceId, value } = action.payload
            const source = state.items[sourceId]
            if (!source) return
            source.name = value
        },
        setGeojsonMeta: (state, action: PayloadAction<{ id: Id; meta: SourceMetadata }>) => {
            const { id, meta } = action.payload
            const source = state.items[id]
            if (source?.type === SourceType.Geojson) {
                source.meta = meta
            }
        },
    },
    selectors: {
        allIds: state => state.allIds,
        items: state => state.items,
        selectSelectedId: state => state.selectedId,
    },
})

export const zoomTo = createAction<string>("source/zoomTo")

export const actions = {
    ...sourceSlice.actions,
    zoomTo,
    addFromUrl,
    addFromClipboard,
    showProperties,
    reload,
    new: newSource,
}

// Other code such as selectors can use the imported `RootState` type
export const selectSourcesAmount = (state: RootState) => state.source.allIds.length
export const selectSourceIds = (state: RootState) => state.source.allIds
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
