import { type Id, LayerType } from "@/types"
import type { PayloadAction } from "@reduxjs/toolkit"
import { createAction, createSlice } from "@reduxjs/toolkit"
import { sourceSlice } from "../source"

export type PhotoIconLayout = "circle" | "square"

const DEFAULT_PHOTO_ICON: PhotoIconLayout = "square"

type Layer = {
    id: Id
    sourceId?: Id
    sourceLayer?: string
    visible: boolean
    fractionIndex: number
    name: string
    type?: LayerType
    filter?: {
        expression: unknown[]
        error: string | null
    }

    color: string
    circle?: {
        minRadius: number
        maxRadius: number
    }
    heatmap?: {
        radius: number
        intensity: number
    }
    photo?: {
        // A key from feature properties for an image src
        srcField?: string
        // A key from feature properties for an sorting value
        valueField?: string
        // An optional key from feature properties to use insead of cluster count
        countField?: string
        icon: PhotoIconLayout
        clusterRadius: number
    }
    extrusion?: {
        height: number
        base: number

        heightField?: string
        baseField?: string
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
    name: "layer",
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
        setPositionBefore: (state, action: PayloadAction<{ layerId: Id; otherLayerId: Id }>) => {
            const { layerId, otherLayerId } = action.payload
            const index = state.items[otherLayerId].fractionIndex
            state.items[layerId].fractionIndex = index - 0.00001
        },
        setPositionAfter: (state, action: PayloadAction<{ layerId: Id; otherLayerId: Id }>) => {
            const { layerId, otherLayerId } = action.payload
            const index = state.items[otherLayerId].fractionIndex
            state.items[layerId].fractionIndex = index + 0.00001
        },
        setSource: (state, action: PayloadAction<{ id: Id; sourceId: Id; sourceLayer?: string }>) => {
            const { id, sourceId, sourceLayer } = action.payload
            state.items[id].sourceId = sourceId
            state.items[id].sourceLayer = sourceLayer
        },
        setVisible: (state, action: PayloadAction<{ id: Id; value: boolean }>) => {
            const { id, value } = action.payload
            state.items[id].visible = value
        },
        setName: (state, action: PayloadAction<{ id: Id; value: string }>) => {
            const { id, value } = action.payload
            state.items[id].name = value
        },
        setType: (state, action: PayloadAction<{ id: Id; type?: LayerType }>) => {
            const { id, type } = action.payload
            const layer = state.items[id]
            layer.type = type

            if (type === LayerType.Point && !layer.circle) {
                layer.circle = {
                    minRadius: 2,
                    maxRadius: 3,
                }
            } else if (type === LayerType.Heatmap && !layer.heatmap) {
                layer.heatmap = {
                    radius: 10,
                    intensity: 3,
                }
            }

            switch (type) {
                case LayerType.Photo: {
                    if (!layer.photo) {
                        layer.photo = {
                            icon: DEFAULT_PHOTO_ICON,
                            clusterRadius: 100,
                        }
                    }
                    break
                }
                case LayerType.Extrusion: {
                    if (!layer.extrusion) {
                        layer.extrusion = {
                            height: 0,
                            base: 0,
                        }
                    }
                    break
                }
                default: {
                    break
                }
            }
        },
        setColor: (state, action: PayloadAction<{ id: Id; color: string }>) => {
            const { id, color } = action.payload
            state.items[id].color = color
        },
        setCircleRadius: (state, action: PayloadAction<{ id: Id; min: number; max: number }>) => {
            const { id, min, max } = action.payload
            const layer = state.items[id]
            if (!layer.circle) return
            layer.circle.minRadius = min
            layer.circle.maxRadius = max
        },
        setHeatmapParameters: (state, action: PayloadAction<{ id: Id; radius?: number; intensity?: number }>) => {
            const { id, radius, intensity } = action.payload
            const layer = state.items[id]
            if (!layer.heatmap) return
            if (typeof radius !== "undefined") {
                layer.heatmap.radius = radius
            }
            if (typeof intensity !== "undefined") {
                layer.heatmap.intensity = intensity
            }
        },
        setPhotoIconLayout: (state, action: PayloadAction<{ id: Id; value: PhotoIconLayout }>) => {
            const { id, value } = action.payload
            const layer = state.items[id]
            if (!layer.photo) return
            layer.photo.icon = value
        },
        setPhotoClusterRadius: (state, action: PayloadAction<{ id: Id; value: number }>) => {
            const { id, value } = action.payload
            const layer = state.items[id]
            if (!layer.photo) return
            layer.photo.clusterRadius = value
        },
        setPhotoField: (state, action: PayloadAction<{ id: Id; src?: string; value?: string; count?: string }>) => {
            const { id, src, value, count } = action.payload
            const layer = state.items[id]
            if (!layer.photo) return
            if (src) {
                layer.photo.srcField = src
            }
            if (value) {
                layer.photo.valueField = value
            }
            if (count) {
                layer.photo.countField = count
            }
        },
        setLayerFilter: (state, action: PayloadAction<{ id: Id; expression: unknown[] | null }>) => {
            const { id, expression } = action.payload
            if (expression === null) {
                state.items[id].filter = undefined
            } else {
                state.items[id].filter = { expression, error: null }
            }
        },
        setLayerFilterError: (state, action: PayloadAction<{ id: Id; error: string }>) => {
            const { id, error } = action.payload
            const layer = state.items[id]
            if (layer.filter) {
                layer.filter.error = error
            }
        },
        setExtrusionOptions: (
            state,
            action: PayloadAction<{ id: Id; base?: number; height?: number; baseField?: string; heightField?: string }>,
        ) => {
            const { id, base, height, baseField, heightField } = action.payload
            const layer = state.items[id]
            if (!layer.extrusion) return
            if (typeof base !== "undefined") {
                layer.extrusion.base = base
            }
            if (typeof height !== "undefined") {
                layer.extrusion.height = height
            }
            if (typeof baseField !== "undefined") {
                layer.extrusion.baseField = baseField
            }
            if (typeof heightField !== "undefined") {
                layer.extrusion.heightField = heightField
            }
        },
    },
    extraReducers: builder => {
        builder.addCase(sourceSlice.actions.removeSource, (state, action) => {
            const sourceId = action.payload
            for (const id of state.allIds) {
                if (state.items[id].sourceId === sourceId) {
                    state.items[id].sourceId = undefined
                }
            }
        })
    },
    selectors: {
        allIds: state => state.allIds,
        items: state => state.items,
    },
})

export const addBlankLayer = createAction<string | undefined>("layer/addBlankLayer")
export const duplicate = createAction<string>("layer/duplicate")

export const actions = {
    ...layerSlice.actions,
    addBlankLayer,
    duplicate,
}

export default layerSlice.reducer
