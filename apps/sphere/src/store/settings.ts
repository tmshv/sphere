import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type SettingsState = {
    copyWrapAsFeatureCollection: boolean
    copyWktSeparator: string
    // White casing under preview geometries, for contrast against a basemap
    previewOutline: boolean
}

const initialState: SettingsState = {
    copyWrapAsFeatureCollection: true,
    copyWktSeparator: "\n",
    previewOutline: true,
}

export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setCopyWrapAsFeatureCollection: (state, action: PayloadAction<boolean>) => {
            state.copyWrapAsFeatureCollection = action.payload
        },
        setCopyWktSeparator: (state, action: PayloadAction<string>) => {
            state.copyWktSeparator = action.payload
        },
        togglePreviewOutline: state => {
            state.previewOutline = !state.previewOutline
        },
    },
    selectors: {
        selectCopyWrapAsFeatureCollection: state => state.copyWrapAsFeatureCollection,
        selectCopyWktSeparator: state => state.copyWktSeparator,
        selectPreviewOutline: state => state.previewOutline,
    },
})

export default settingsSlice.reducer
