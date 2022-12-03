import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."
import { DatasetRow, Id, SourceType } from "@/types"
import { layerSlice } from "../layer"

// Define a type for the slice state
type SelectionState = {
    layerId?: Id
    sourceId?: Id
    selectedIds: number[]
}

// Define the initial state using that type
const initialState: SelectionState = {
    selectedIds: [],
}

export const selectionSlice = createSlice({
    name: "selection",
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        reset: state => {
            state.sourceId = undefined
            state.selectedIds = []
        },
        // removeSource: (state, action: PayloadAction<string>) => {
        //     const sourceId = action.payload
        //     delete state.items[sourceId]
        //     state.allIds = state.allIds.filter(id => id !== sourceId)
        //     if (state.lastAdded === sourceId) {
        //         state.lastAdded = undefined
        //     }
        // },
        selectSource: (state, action: PayloadAction<{ sourceId: Id }>) => {
            state.sourceId = action.payload.sourceId
        },
        selectLayer: (state, action: PayloadAction<{ layerId?: Id }>) => {
            state.layerId = action.payload.layerId
        },
        selectOne: (state, action: PayloadAction<{ layerId: Id, featureId: number }>) => {
            state.layerId = action.payload.layerId
            state.selectedIds = [action.payload.featureId]
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(layerSlice.actions.removeLayer, (state, action) => {
                state.layerId = undefined
            })
    },
})

export const selectCurrentSource = (state: RootState) => state.selection.sourceId
export const selectCurrentLayer = (state: RootState) => state.selection.layerId
export const selectProperties = (state: RootState) => {
    const layerId = state.selection.layerId
    if (!layerId) {
        return null
    }

    const sourceId = state.layer.items[layerId].sourceId
    if (!sourceId) {
        return null
    }

    const ids = state.selection.selectedIds
    const dataId = ids[0]

    const source = state.source.items[sourceId]
    if (!source) {
        return null
    }

    return null
    // const row = source.dataset.data.find(record => record.id === dataId) as DatasetRow<any>
    // if (!row) {
    //     return null
    // }

    // const props = row.data
    // if (!props) {
    //     return null
    // }

    // const excludedKeys = new Set(["id"])

    // return [...Object.entries(props)]
    //     .filter(([key, _]) => !excludedKeys.has(key))
    //     .map(([key, value]) => {
    //         return {
    //             key,
    //             value,
    //         }
    //     })
}

export default selectionSlice.reducer
