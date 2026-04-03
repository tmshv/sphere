import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."

type Properties = Record<string, any>

// Define a type for the slice state
type PropertiesState = {
    values?: Properties[]
}

// Define the initial state using that type
const initialState: PropertiesState = {}

export const propertiesSlice = createSlice({
    name: "properties",
    initialState,
    reducers: {
        reset: state => {
            state.values = undefined
        },
        set: (state, action: PayloadAction<{ values: Properties | Properties[] }>) => {
            state.values = Array.isArray(action.payload.values) ? action.payload.values : [action.payload.values]
        },
    },
})

const blacklist = new Set<string>()
export const selectProperties = (state: RootState) => {
    if (!state.properties.values) {
        return null
    }
    return state.properties.values.map(values => {
        return Object.keys(values)
            .filter(key => !blacklist.has(key))
            .map(key => {
                const raw = values?.[key]
                const value = typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw ?? "")
                return { key, value }
            })
    })
}

export default propertiesSlice.reducer
