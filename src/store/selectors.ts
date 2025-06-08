import { layerSlice as layer } from "./layer"
import { selectionSlice as selection } from "./selection"
import { STYLE_OSM } from "@/const"
import type { RootState } from "."
import { drawSlice as draw } from "./draw"
import { appSlice as app } from "./app"
import { sourceSlice as source } from "./source"
// Other code such as selectors can use the imported `RootState` type
const selectProjection = (state: RootState) => {
    const drawing = draw.selectors.isDrawing(state)

    return drawing
        ? "mercator"
        : state.projection.value
}

export const selectChangeProjectionAvailable = (state: RootState) => {
    return !draw.selectors.isDrawing(state)
}
// Other code such as selectors can use the imported `RootState` type
export const selectMapStyle = (state: RootState) => {
    const drawing = draw.selectors.isDrawing(state)
    if (drawing) {
        return STYLE_OSM
    }

    return state.mapStyle.value
}

export const selectors = {
    app: app.selectors,
    draw: draw.selectors,
    projection: {
        projection: selectProjection,
        changeProjectionAvailable: selectChangeProjectionAvailable,
    },
    mapStyle: {
        style: selectMapStyle,
    },
    source: source.selectors,
    layer: layer.selectors,
    selection: selection.selectors,
}
