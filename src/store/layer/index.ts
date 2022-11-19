import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '..'
import { LayerType } from '@/types'

type Layer = {
    id: string
    sourceId?: string
    fractionIndex: number
    name: string
    type?: LayerType

    color: string
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
        setType: (state, action: PayloadAction<{ id: string, type?: LayerType }>) => {
            const { id, type } = action.payload
            state.items[id].type = type
        },
        setColor: (state, action: PayloadAction<{ id: string, color: string }>) => {
            const { id, color } = action.payload
            state.items[id].color = color
        },
    },
})

export const selectLayerIds = (state: RootState) => state.layer.allIds

export default layerSlice.reducer
