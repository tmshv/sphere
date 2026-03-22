import { describe, expect, test } from "vitest"
import reducer, { toolsSlice } from "./tools"

const { setTool } = toolsSlice.actions
const { selectActiveTool, selectPanEnabled } = toolsSlice.selectors

const makeRootState = (tools: object) => ({ tools }) as any

describe("toolsSlice reducer", () => {
    test("initial state has activeTool pan", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.activeTool).toBe("pan")
    })

    test("setTool pan sets activeTool to pan", () => {
        const state = reducer({ activeTool: null }, setTool("pan"))
        expect(state.activeTool).toBe("pan")
    })

    test("setTool null clears activeTool", () => {
        const state = reducer({ activeTool: "pan" }, setTool(null))
        expect(state.activeTool).toBeNull()
    })
})

describe("toolsSlice selectors", () => {
    test("selectActiveTool returns activeTool", () => {
        expect(selectActiveTool(makeRootState({ activeTool: "pan" }))).toBe("pan")
        expect(selectActiveTool(makeRootState({ activeTool: null }))).toBeNull()
    })

    test("selectPanEnabled returns true when activeTool is pan", () => {
        expect(selectPanEnabled(makeRootState({ activeTool: "pan" }))).toBe(true)
    })

    test("selectPanEnabled returns false when activeTool is null", () => {
        expect(selectPanEnabled(makeRootState({ activeTool: null }))).toBe(false)
    })
})
