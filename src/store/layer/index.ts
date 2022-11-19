import { createReducer, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { LayerType } from '@/types'

type Layer = {
    id: string
    sourceId?: string
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
    allIds: string[]
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
        },
        removeLayer: (state, action: PayloadAction<string>) => {
            const layerId = action.payload
            delete state.items[layerId]
            state.allIds = state.allIds.filter(id => id !== layerId)
        },
        setVisible: (state, action: PayloadAction<{ id: string, value: boolean }>) => {
            const { id, value } = action.payload
            state.items[id].visible = value
        },
        setType: (state, action: PayloadAction<{ id: string, type?: LayerType }>) => {
            const { id, type } = action.payload
            const layer = state.items[id]
            layer.type = type

            if ((type === LayerType.Point) && !layer.circle) {
                layer.circle = {
                    minRadius: 2,
                    maxRadius: 4,
                }
            } else if ((type === LayerType.Heatmap) && !layer.heatmap) {
                layer.heatmap = {
                    radius: 10,
                }
            }
        },
        setColor: (state, action: PayloadAction<{ id: string, color: string }>) => {
            const { id, color } = action.payload
            state.items[id].color = color
        },
        setCircleRadius: (state, action: PayloadAction<{ id: string, min: number, max: number }>) => {
            const { id, min, max } = action.payload
            const layer = state.items[id]
            layer.circle!.minRadius = min
            layer.circle!.maxRadius = max
        },
        setHeatmapRadius: (state, action: PayloadAction<{ id: string, value: number }>) => {
            const { id, value } = action.payload
            const layer = state.items[id]
            layer.heatmap!.radius = value
        },
    },
})

export const selectLayerIds = (state: RootState) => state.layer.allIds

export default layerSlice.reducer
