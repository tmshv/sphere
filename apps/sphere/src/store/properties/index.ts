import { createSelector, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { selectMapTool } from "../app"
import { isPopupVisible } from "@/lib/map-tools"

type Properties = Record<string, unknown>

export type PropertiesEntry = {
    id: string | number
    values: Properties
}

type PropertiesState = {
    entries?: PropertiesEntry[]
    hoverEntries?: PropertiesEntry[]
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
        resetHover: state => {
            state.hoverEntries = undefined
        },
        setHover: (state, action: PayloadAction<{ entries: PropertiesEntry[] }>) => {
            state.hoverEntries = action.payload.entries
        },
    },
})

const blacklist = new Set<string>()

function projectEntries(entries: PropertiesEntry[]) {
    return entries.map(entry => {
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

export const selectProperties = (state: RootState) => {
    if (!state.properties.entries) {
        return null
    }
    return projectEntries(state.properties.entries)
}

export const selectHoverProperties = (state: RootState) => {
    if (!state.properties.hoverEntries) {
        return null
    }
    return projectEntries(state.properties.hoverEntries)
}

export const selectPopupVisible = createSelector([selectMapTool], tool => isPopupVisible(tool))

export const selectPopupEntries = createSelector(
    [selectMapTool, selectHoverProperties, selectProperties],
    (tool, hover, selection) => {
        if (!isPopupVisible(tool)) return null
        if (hover && hover.length > 0) return hover
        if (selection && selection.length > 0) return selection
        return null
    },
)

export default propertiesSlice.reducer
