import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type Tool = "navigation"

type ToolsState = {
    activeTool: Tool | null
}

const initialState: ToolsState = {
    activeTool: "navigation",
}

export const toolsSlice = createSlice({
    name: "tools",
    initialState,
    reducers: {
        setTool: (state, action: PayloadAction<Tool | null>) => {
            state.activeTool = action.payload
        },
    },
    selectors: {
        selectActiveTool: state => state.activeTool,
        selectNavigationEnabled: state => state.activeTool === "navigation",
    },
})

export default toolsSlice.reducer
