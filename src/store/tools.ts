import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export type Tool = "pan"

type ToolsState = {
    activeTool: Tool | null
}

const initialState: ToolsState = {
    activeTool: "pan",
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
        selectPanEnabled: state => state.activeTool === "pan",
    },
})

export default toolsSlice.reducer
