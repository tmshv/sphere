import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."

// Define a type for the slice state
type PropertiesState = {
    values?: Record<string, any>
}

// Define the initial state using that type
const initialState: PropertiesState = {
}

export const propertiesSlice = createSlice({
    name: "properties",
    initialState,
    reducers: {
        reset: state => {
            state.values = undefined
        },
        set: (state, action: PayloadAction<{ values: Record<string, any> }>) => {
            state.values = action.payload.values
        },
    },
})

const blacklist = new Set<string>([])
export const selectProperties = (state: RootState) => {
    if (!state.properties.values) {
        return null
    }
    return Object.keys(state.properties.values)
        .filter(key => !blacklist.has(key))
        .map(key => ({
            key,
            value: state.properties.values![key],
        }))
}

export default propertiesSlice.reducer
