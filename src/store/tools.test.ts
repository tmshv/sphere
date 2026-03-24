import { describe, expect, test } from "vitest"
import reducer, { toolsSlice } from "./tools"

const { setTool } = toolsSlice.actions
const { selectActiveTool, selectNavigationEnabled } = toolsSlice.selectors

const makeRootState = (tools: object) => ({ tools }) as any

describe("toolsSlice reducer", () => {
    test("initial state has activeTool navigation", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.activeTool).toBe("navigation")
    })

    test("setTool navigation sets activeTool to navigation", () => {
        const state = reducer({ activeTool: null }, setTool("navigation"))
        expect(state.activeTool).toBe("navigation")
    })

    test("setTool null clears activeTool", () => {
        const state = reducer({ activeTool: "navigation" }, setTool(null))
        expect(state.activeTool).toBeNull()
    })
})

describe("toolsSlice selectors", () => {
    test("selectActiveTool returns activeTool", () => {
        expect(selectActiveTool(makeRootState({ activeTool: "navigation" }))).toBe("navigation")
        expect(selectActiveTool(makeRootState({ activeTool: null }))).toBeNull()
    })

    test("selectNavigationEnabled returns true when activeTool is navigation", () => {
        expect(selectNavigationEnabled(makeRootState({ activeTool: "navigation" }))).toBe(true)
    })

    test("selectNavigationEnabled returns false when activeTool is null", () => {
        expect(selectNavigationEnabled(makeRootState({ activeTool: null }))).toBe(false)
    })
})
