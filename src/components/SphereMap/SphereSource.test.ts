import type { RootState } from "@/store"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectSource } from "./SphereSource"

function makeState(source: object) {
    return {
        source: { items: { src1: { id: "src1", name: "test", fractionIndex: 0, ...source } } },
    } as unknown as RootState
}

describe("selectSource FeatureCollection", () => {
    test("returns null (data fetched async via IPC)", () => {
        const state = makeState({
            type: SourceType.FeatureCollection,
            location: "memory://test-id",
            version: 0,
            editable: true,
            pending: false,
            meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
        })
        const result = selectSource(state, "src1")
        expect(result).toBeNull()
    })
})

describe("selectSource MVT", () => {
    test("uses sphere://mbtiles/{id} as url, not location", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/data.mbtiles",
            format: "pbf",
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
            format: "pbf",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        const url = result?.type === "vector" || result?.type === "raster" ? result.url : undefined
        expect(url).not.toMatch(/^file:\/\//)
    })

    test("returns raster source type for png format", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/raster.mbtiles",
            format: "png",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect(result).toMatchObject({
            type: "raster",
            url: "sphere://mbtiles/src1",
        })
    })

    test("returns raster source type for jpg format", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/raster.mbtiles",
            format: "jpg",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect(result).toMatchObject({ type: "raster" })
    })

    test("returns raster source type for webp format", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/raster.mbtiles",
            format: "webp",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect(result).toMatchObject({ type: "raster" })
    })

    test("returns vector source type for pbf format", () => {
        const state = makeState({
            type: SourceType.MVT,
            location: "file:///Users/foo/vector.mbtiles",
            format: "pbf",
            sourceLayers: [],
            tilejson: {},
            editable: false,
            pending: false,
        })
        const result = selectSource(state, "src1")
        expect(result).toMatchObject({ type: "vector" })
    })
})
