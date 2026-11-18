import { describe, expect, test } from "vitest"
import { makeGeojsonSource, makeSourceState } from "@/testutils"
import type { RootState } from "."
import { selectSelectionTargetInteractive, selectSelectionTargetSourceId } from "./selection-target"

function makeState(drawSourceId: string | undefined, visible = true): RootState {
    const source = makeSourceState([makeGeojsonSource("s1")], { selectedIds: ["s1"] })
    const state = {
        source: { ...source, nodes: { ...source.nodes, s1: { ...source.nodes.s1, visible } } },
        draw: { sourceId: drawSourceId, pending: false, hiddenIds: [] },
    }
    return state as unknown as RootState
}

describe("selection target", () => {
    test("is the drawn source while drawing, and interactive", () => {
        const state = makeState("s2", false)
        expect(selectSelectionTargetSourceId(state)).toBe("s2")
        expect(selectSelectionTargetInteractive(state)).toBe(true)
    })

    test("falls back to the tree selection without a draw session", () => {
        const state = makeState(undefined)
        expect(selectSelectionTargetSourceId(state)).toBe("s1")
        expect(selectSelectionTargetInteractive(state)).toBe(true)
    })

    test("fallback interactivity follows the tree", () => {
        expect(selectSelectionTargetInteractive(makeState(undefined, false))).toBe(false)
    })
})
