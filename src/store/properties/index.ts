import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { RootState } from ".."

type Properties = Record<string, any>

// Define a type for the slice state
type PropertiesState = {
    values?: Properties[]
    blacklist: Set<string>
}

// Define the initial state using that type
const initialState: PropertiesState = {
    blacklist: new Set()
}

export const propertiesSlice = createSlice({
    name: "properties",
    initialState,
    reducers: {
        reset: state => {
            state.values = undefined
        },
        set: (state, action: PayloadAction<{ values: Properties | Properties[] }>) => {
            state.values = Array.isArray(action.payload.values)
                ? action.payload.values
                : [action.payload.values]
        },
    },
})

export const selectProperties = (state: RootState) => {
    if (!state.properties.values) {
        return null
    }
    return state.properties.values.map(values => {
        return Object.keys(values)
            .filter(key => !state.properties.blacklist.has(key))
            .map(key => ({
                key,
                value: values![key],
            }))
    })
}

export default propertiesSlice.reducer
