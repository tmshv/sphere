import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type MapInteractionSettings = {
    dragPan: boolean
    scrollZoom: boolean
    dragRotate: boolean
}

const initialState: MapInteractionSettings = {
    dragPan: true,
    scrollZoom: true,
    dragRotate: true,
}

export const mapInteractionSlice = createSlice({
    name: "mapInteraction",
    initialState,
    reducers: {
        setDragPan: (state, action: PayloadAction<boolean>) => {
            state.dragPan = action.payload
        },
        setScrollZoom: (state, action: PayloadAction<boolean>) => {
            state.scrollZoom = action.payload
        },
        setDragRotate: (state, action: PayloadAction<boolean>) => {
            state.dragRotate = action.payload
        },
    },
    selectors: {
        selectDragPan: state => state.dragPan,
        selectScrollZoom: state => state.scrollZoom,
        selectDragRotate: state => state.dragRotate,
    },
})

export default mapInteractionSlice.reducer
