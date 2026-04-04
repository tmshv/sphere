import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."

type Properties = Record<string, unknown>

export type PropertiesEntry = {
    id: string | number
    values: Properties
}

type PropertiesState = {
    entries?: PropertiesEntry[]
}

const initialState: PropertiesState = {}

export const propertiesSlice = createSlice({
    name: "properties",
    initialState,
    reducers: {
        reset: state => {
            state.entries = undefined
        },
        set: (state, action: PayloadAction<{ entries: PropertiesEntry | PropertiesEntry[] }>) => {
            state.entries = Array.isArray(action.payload.entries) ? action.payload.entries : [action.payload.entries]
        },
    },
})

const blacklist = new Set<string>()
export const selectProperties = (state: RootState) => {
    if (!state.properties.entries) {
        return null
    }
    return state.properties.entries.map(entry => {
        const items = Object.keys(entry.values)
            .filter(key => !blacklist.has(key))
            .map(key => {
                const raw = entry.values[key]
                const value = typeof raw === "object" && raw !== null ? JSON.stringify(raw) : String(raw ?? "")
                return { key, value }
            })
        return { id: entry.id, items }
    })
}

export default propertiesSlice.reducer
