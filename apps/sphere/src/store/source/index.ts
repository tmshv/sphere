import { canMove, collectSubtree, createSourceNodes, moveNodes } from "@/lib/source-tree"
import { type Id, type SourceFormat, type SourceMetadata, type SourceNodes, SourceType } from "@/types"
import type { Source } from "@/types/source"
import type { TileJSON } from "@/types/tilejson"
import { createAction, createSelector, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."
import addFromClipboard from "./addFromClipboard"
import addFromUrl from "./addFromUrl"
import newSource from "./new"
import reload from "./reload"
import { showProperties } from "./showProperties"
import { selectSelectedSourceId } from "./tree-selectors"

const NEW_NODE_INDEX = 0 // New nodes go to the top of their sibling list

// Define a type for the slice state
type SourceState = {
    // Unordered index of data sources; tree order lives in `rootIds` / node `children`
    items: Record<string, Source>
    allIds: Id[]
    lastAdded?: Id
    nodes: SourceNodes
    rootIds: Id[]
    expandedIds: Id[]
    selectedIds: Id[]
}

// Define the initial state using that type
const initialState: SourceState = {
    items: {},
    allIds: [],
    nodes: {},
    rootIds: [],
    expandedIds: [],
    selectedIds: [],
}

function upsertSource(state: SourceState, source: Source) {
    const { id } = source
    state.items[id] = source
    if (!state.allIds.includes(id)) {
        state.allIds.push(id)
    }
    state.lastAdded = id

    const { root, children } = createSourceNodes(source)
    const previous = state.nodes[id]
    if (previous) {
        // Re-added in place: keep position, parent and visibility, rebuild children
        for (const staleId of previous.children.flatMap(childId => collectSubtree(state.nodes, childId))) {
            delete state.nodes[staleId]
        }
        state.nodes[id] = { ...root, parentId: previous.parentId, visible: previous.visible }
    } else {
        state.nodes[id] = root
        state.rootIds.splice(NEW_NODE_INDEX, 0, id)
    }
    for (const child of children) {
        state.nodes[child.id] = child
    }
    if (children.length > 0 && !state.expandedIds.includes(id)) {
        state.expandedIds.push(id)
    }
    state.expandedIds = state.expandedIds.filter(nodeId => nodeId in state.nodes)
    state.selectedIds = state.selectedIds.filter(nodeId => nodeId in state.nodes)
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
            state.nodes = {}
            state.rootIds = []
            state.expandedIds = []
            state.selectedIds = []
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
            upsertSource(state, {
                id,
                type: SourceType.FeatureCollection,
                name,
                location,
                version: 0,
                pending: false,
                editable: true,
                meta,
            })
        },
        bumpVersion: (state, action: PayloadAction<Id>) => {
            const source = state.items[action.payload]
            if (!source) return
            if (source.type === SourceType.Geojson) {
                source.version++
                return
            }
            if (source.type === SourceType.FeatureCollection && !source.pending) {
                source.version++
            }
        },
        addGeojsonSource: (
            state,
            action: PayloadAction<{
                id: Id
                name: string
                location: string
                meta: SourceMetadata
                format: SourceFormat
            }>,
        ) => {
            const { id, name, location, meta, format } = action.payload
            upsertSource(state, {
                id,
                name,
                location,
                type: SourceType.Geojson,
                format,
                version: 0,
                pending: false,
                editable: false,
                meta,
            })
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
            upsertSource(state, {
                id,
                name,
                location,
                type: SourceType.MVT,
                pending: false,
                editable: false,
                tilejson,
                format,
                sourceLayers: sourceLayers ?? [],
            })
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
            upsertSource(state, {
                id: sourceId,
                name,
                location,
                type: SourceType.Raster,
                pending: false,
                editable: false,
            })
        },
        addFolder: (state, action: PayloadAction<{ id: Id; name: string; parentId?: Id }>) => {
            const { id, name, parentId } = action.payload
            if (state.nodes[id]) return
            const siblings = parentId === undefined ? state.rootIds : state.nodes[parentId]?.children
            if (!siblings) return
            state.nodes[id] = { id, name, parentId, kind: "folder", visible: true, children: [] }
            siblings.splice(NEW_NODE_INDEX, 0, id)
        },
        select: (state, action: PayloadAction<Id | undefined>) => {
            const id = action.payload
            state.selectedIds = id ? [id] : []
        },
        removeSource: (state, action: PayloadAction<Id>) => {
            const id = action.payload
            const node = state.nodes[id]
            // A child is a piece of its parent and cannot be removed on its own
            if (node?.parentId !== undefined) return
            const removed = new Set(node ? collectSubtree(state.nodes, id) : [id])
            for (const removedId of removed) {
                delete state.nodes[removedId]
                delete state.items[removedId]
            }
            const keep = (nodeId: Id) => !removed.has(nodeId)
            state.allIds = state.allIds.filter(keep)
            state.rootIds = state.rootIds.filter(keep)
            state.expandedIds = state.expandedIds.filter(keep)
            state.selectedIds = state.selectedIds.filter(keep)
            if (state.lastAdded !== undefined && removed.has(state.lastAdded)) {
                state.lastAdded = undefined
            }
        },
        setVisible: (state, action: PayloadAction<{ id: Id; value: boolean }>) => {
            const { id, value } = action.payload
            const node = state.nodes[id]
            if (!node) return
            node.visible = value
        },
        setExpanded: (state, action: PayloadAction<{ id: Id; value: boolean }>) => {
            const { id, value } = action.payload
            const expanded = state.expandedIds.includes(id)
            if (value && !expanded && id in state.nodes) {
                state.expandedIds.push(id)
            }
            if (!value && expanded) {
                state.expandedIds = state.expandedIds.filter(nodeId => nodeId !== id)
            }
        },
        move: (state, action: PayloadAction<{ ids: Id[]; parentId?: Id; index: number }>) => {
            const { ids, parentId, index } = action.payload
            if (ids.length === 0) return
            if (!canMove(state.nodes, state.rootIds, ids, parentId, index)) return
            const next = moveNodes(state.nodes, state.rootIds, ids, parentId, index)
            state.nodes = next.nodes
            state.rootIds = next.rootIds
        },
        setName: (state, action: PayloadAction<{ id: Id; value: string }>) => {
            const { id, value } = action.payload
            const source = state.items[id]
            if (source) {
                source.name = value
            }
            const node = state.nodes[id]
            if (node) {
                node.name = value
            }
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
        nodes: state => state.nodes,
        rootIds: state => state.rootIds,
        expandedIds: state => state.expandedIds,
        selectSelectedIds: state => state.selectedIds,
        selectSelectedId: state => state.selectedIds.at(0),
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

export const selectCurrentSourceItem = createSelector(
    [selectSelectedSourceId, sourceSlice.selectors.items],
    (id, items) => (id ? (items[id] ?? null) : null),
)
// export const selectHasPending = (state: RootState) => state.source.pendingItems.length > 0

export default sourceSlice.reducer
