import { createAction, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { Id, LayerType } from '@/types'
import { sourceSlice } from '../source'

type Layer = {
    id: Id
    sourceId?: Id
    sourceLayer?: string
    visible: boolean
    fractionIndex: number
    name: string
    type?: LayerType

    color: string
    circle?: {
        minRadius: number
        maxRadius: number
    }
    heatmap?: {
        radius: number
    }
}

// Define a type for the slice state
type LayerState = {
    items: Record<string, Layer>
    allIds: Id[]
    lastAdded?: Id
}

// Define the initial state using that type
const initialState: LayerState = {
    items: {},
    allIds: [],
}

export const layerSlice = createSlice({
    name: 'layer',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        addLayer: (state, action: PayloadAction<Layer>) => {
            const layerId = action.payload.id
            state.items[layerId] = action.payload
            state.allIds.push(layerId)
            state.lastAdded = layerId
        },
        removeLayer: (state, action: PayloadAction<Id>) => {
            const layerId = action.payload
            delete state.items[layerId]
            state.allIds = state.allIds.filter(id => id !== layerId)
        },
        setPositionBefore: (state, action: PayloadAction<{ layerId: Id, otherLayerId: Id }>) => {
            const {layerId, otherLayerId} = action.payload
            const index = state.items[otherLayerId].fractionIndex
            state.items[layerId].fractionIndex = index - 0.00001
        },
        setPositionAfter: (state, action: PayloadAction<{ layerId: Id, otherLayerId: Id }>) => {
            const {layerId, otherLayerId} = action.payload
            const index = state.items[otherLayerId].fractionIndex
            state.items[layerId].fractionIndex = index + 0.00001
        },
        setSource: (state, action: PayloadAction<{ id: Id, sourceId: Id, sourceLayer?: string }>) => {
            const { id, sourceId, sourceLayer } = action.payload
            state.items[id].sourceId = sourceId
            state.items[id].sourceLayer = sourceLayer
        },
        setVisible: (state, action: PayloadAction<{ id: Id, value: boolean }>) => {
            const { id, value } = action.payload
            state.items[id].visible = value
        },
        setName: (state, action: PayloadAction<{ id: Id, value: string }>) => {
            const { id, value } = action.payload
            state.items[id].name = value
        },
        setType: (state, action: PayloadAction<{ id: Id, type?: LayerType }>) => {
            const { id, type } = action.payload
            const layer = state.items[id]
            layer.type = type

            if ((type === LayerType.Point) && !layer.circle) {
                layer.circle = {
                    minRadius: 2,
                    maxRadius: 3,
                }
            } else if ((type === LayerType.Heatmap) && !layer.heatmap) {
                layer.heatmap = {
                    radius: 10,
                }
            }
        },
        setColor: (state, action: PayloadAction<{ id: Id, color: string }>) => {
            const { id, color } = action.payload
            state.items[id].color = color
        },
        setCircleRadius: (state, action: PayloadAction<{ id: Id, min: number, max: number }>) => {
            const { id, min, max } = action.payload
            const layer = state.items[id]
            layer.circle!.minRadius = min
            layer.circle!.maxRadius = max
        },
        setHeatmapRadius: (state, action: PayloadAction<{ id: Id, value: number }>) => {
            const { id, value } = action.payload
            const layer = state.items[id]
            layer.heatmap!.radius = value
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(sourceSlice.actions.removeSource, (state, action) => {
                const sourceId = action.payload
                for (const id of state.allIds) {
                    if (state.items[id].sourceId === sourceId) {
                        state.items[id].sourceId = undefined
                    }
                }
            })
    }
})

export const addBlankLayer = createAction("layer/addBlankLayer")
export const duplicate = createAction<string>("layer/duplicate")

export const actions = {
    ...layerSlice.actions,
    addBlankLayer,
    duplicate,
}

export const selectLayerIds = (state: RootState) => state.layer.allIds
export const selectVisibleLayerIds = (state: RootState) => state.layer.allIds.filter(id => {
    const layer = state.layer.items[id]
    return layer.visible
})

export default layerSlice.reducer
