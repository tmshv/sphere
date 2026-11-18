import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type Tool = "navigation" | "draw"

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
        reset: state => {
            state.activeTool = "navigation"
        },
    },
    selectors: {
        selectActiveTool: state => state.activeTool,
        // Draw mode keeps the statusbar map tool in force, so the map pans there too
        selectNavigationEnabled: state => state.activeTool === "navigation" || state.activeTool === "draw",
    },
})

export default toolsSlice.reducer
