import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

type SettingsState = {
    copyWrapAsFeatureCollection: boolean
    copyWktSeparator: string
}

const initialState: SettingsState = {
    copyWrapAsFeatureCollection: true,
    copyWktSeparator: "\n",
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
    },
    selectors: {
        selectCopyWrapAsFeatureCollection: state => state.copyWrapAsFeatureCollection,
        selectCopyWktSeparator: state => state.copyWktSeparator,
    },
})

export default settingsSlice.reducer
