import { describe, test, expect } from "vitest"
import { selectSource } from "./SphereSource"
import { SourceType } from "@/types"

function makeState(source: object) {
    return { source: { items: { "src1": { id: "src1", name: "test", fractionIndex: 0, ...source } } } } as any
}

describe("selectSource MVT", () => {
    test("uses sphere://mbtiles/{id} as url, not location", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/data.mbtiles",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect(result).toMatchObject({
            type: "vector",
            url: "sphere://mbtiles/src1",
        })
    })

    test("does not pass file:// location as url", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/data.mbtiles",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect((result as any)?.url).not.toMatch(/^file:\/\//)
    })
})
