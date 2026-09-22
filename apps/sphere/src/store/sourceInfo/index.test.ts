import { describe, expect, test } from "vitest"
import reducer, { actions } from "./index"

const info = {
    file: { size_bytes: 10, modified: null },
    schema: {
        columns: { name: "String" },
        points_count: 1,
        multi_points_count: 0,
        lines_count: 0,
        multi_lines_count: 0,
        polygons_count: 0,
        multi_polygons_count: 0,
        collections_count: 0,
        null_geometry_count: 0,
        features_count: 1,
    },
    details: { format: "geojson" as const },
}

describe("sourceInfo reducer", () => {
    test("infoRequested marks the entry pending", () => {
        const state = reducer(undefined, actions.infoRequested("s1"))
        expect(state.info.s1?.status).toBe("pending")
    })

    test("infoReceived stores the payload and marks it ready", () => {
        let state = reducer(undefined, actions.infoRequested("s1"))
        state = reducer(state, actions.infoReceived({ id: "s1", info }))
        expect(state.info.s1?.status).toBe("ready")
        expect(state.info.s1?.details).toEqual({ format: "geojson" })
    })

    test("infoFailed marks the entry errored without clearing other sources", () => {
        let state = reducer(undefined, actions.infoReceived({ id: "s1", info }))
        state = reducer(state, actions.infoFailed("s2"))
        expect(state.info.s2?.status).toBe("error")
        expect(state.info.s1?.status).toBe("ready")
    })

    test("statsReceived stores per column under its source", () => {
        const stats = { column: "name", col_type: "String", count: 5, null_count: 0 }
        const state = reducer(undefined, actions.statsReceived({ id: "s1", column: "name", stats }))
        expect(state.stats.s1?.name?.status).toBe("ready")
        expect(state.stats.s1?.name?.data).toEqual(stats)
    })

    test("statsRequested for one column leaves sibling columns untouched", () => {
        const stats = { column: "a", col_type: "String", count: 1, null_count: 0 }
        let state = reducer(undefined, actions.statsReceived({ id: "s1", column: "a", stats }))
        state = reducer(state, actions.statsRequested({ id: "s1", column: "b" }))
        expect(state.stats.s1?.a?.status).toBe("ready")
        expect(state.stats.s1?.b?.status).toBe("pending")
    })

    test("invalidate drops both caches for that source only", () => {
        let state = reducer(undefined, actions.infoReceived({ id: "s1", info }))
        state = reducer(state, actions.infoReceived({ id: "s2", info }))
        state = reducer(
            state,
            actions.statsReceived({
                id: "s1",
                column: "a",
                stats: { column: "a", col_type: "String", count: 1, null_count: 0 },
            }),
        )
        state = reducer(state, actions.invalidate("s1"))
        expect(state.info.s1).toBeUndefined()
        expect(state.stats.s1).toBeUndefined()
        expect(state.info.s2?.status).toBe("ready")
    })
})
