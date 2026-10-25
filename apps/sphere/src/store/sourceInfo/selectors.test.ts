import { makeMvtSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectCurrentSourceFields, selectCurrentSourceInfo, selectCurrentSourceMeta } from "./selectors"

const makeState = (overrides: object = {}) =>
    ({
        source: makeSourceState([], { selectedIds: ["s1"] }),
        sourceInfo: { info: {}, stats: {} },
        ...overrides,
    }) as never

describe("selectCurrentSourceFields", () => {
    test("returns an empty array when nothing is selected", () => {
        const state = makeState({ source: makeSourceState([]) })
        expect(selectCurrentSourceFields(state)).toEqual([])
    })

    test("marks a column with no stats yet as loading", () => {
        const state = makeState({
            source: makeSourceState(
                [{ id: "s1", name: "s1", type: SourceType.Geojson, meta: { columns: { name: "String" } } }],
                {
                    selectedIds: ["s1"],
                },
            ),
            sourceInfo: { info: {}, stats: {} },
        })
        const fields = selectCurrentSourceFields(state)
        expect(fields).toHaveLength(1)
        expect(fields[0]?.summary.kind).toBe("loading")
    })

    test("builds a numeric summary from a histogram", () => {
        const state = makeState({
            source: makeSourceState(
                [{ id: "s1", name: "s1", type: SourceType.Geojson, meta: { columns: { elevation: "Number" } } }],
                {
                    selectedIds: ["s1"],
                },
            ),
            sourceInfo: {
                info: {},
                stats: {
                    s1: {
                        elevation: {
                            status: "ready",
                            data: {
                                column: "elevation",
                                col_type: "Number",
                                count: 3,
                                null_count: 1,
                                min: 0,
                                max: 10,
                                mean: 5,
                                histogram: [
                                    { min: 0, max: 5, count: 2 },
                                    { min: 5, max: 10, count: 1 },
                                ],
                            },
                        },
                    },
                },
            },
        })
        const fields = selectCurrentSourceFields(state)
        expect(fields[0]?.summary).toEqual({
            kind: "numeric",
            min: 0,
            max: 10,
            mean: 5,
            histogram: [2, 1],
        })
        expect(fields[0]?.nullCount).toBe(1)
    })

    test("builds a string summary from unique count and top values", () => {
        const state = makeState({
            source: makeSourceState(
                [{ id: "s1", name: "s1", type: SourceType.Geojson, meta: { columns: { region: "String" } } }],
                {
                    selectedIds: ["s1"],
                },
            ),
            sourceInfo: {
                info: {},
                stats: {
                    s1: {
                        region: {
                            status: "ready",
                            data: {
                                column: "region",
                                col_type: "String",
                                count: 3,
                                null_count: 0,
                                unique_count: 342,
                                top_values: [["Moscow", 1204]],
                            },
                        },
                    },
                },
            },
        })
        expect(selectCurrentSourceFields(state)[0]?.summary).toEqual({
            kind: "string",
            unique: 342,
            topValues: [["Moscow", 1204]],
        })
    })

    test("selectCurrentSourceMeta returns null for a source without meta", () => {
        const state = makeState({
            source: makeSourceState([{ id: "s1", name: "s1", type: SourceType.Raster }], {
                selectedIds: ["s1"],
            }),
        })
        expect(selectCurrentSourceMeta(state)).toBeNull()
    })

    test("selectCurrentSourceMeta returns the metadata when present", () => {
        const meta = { columns: {}, pointsCount: 3, featuresCount: 3 }
        const state = makeState({
            source: makeSourceState([{ id: "s1", name: "s1", type: SourceType.Geojson, meta }], {
                selectedIds: ["s1"],
            }),
        })
        expect(selectCurrentSourceMeta(state)).toEqual(meta)
    })

    test("sorts fields by name", () => {
        const state = makeState({
            source: makeSourceState(
                [
                    {
                        id: "s1",
                        name: "s1",
                        type: SourceType.Geojson,
                        meta: { columns: { zebra: "String", alpha: "String" } },
                    },
                ],
                {
                    selectedIds: ["s1"],
                },
            ),
            sourceInfo: { info: {}, stats: {} },
        })
        expect(selectCurrentSourceFields(state).map(f => f.name)).toEqual(["alpha", "zebra"])
    })
})

describe("selectCurrentSourceInfo", () => {
    const MVT_ID = "m1"
    const ROADS_NODE_ID = `${MVT_ID}/roads`
    const mvtInfo = { file: { size_bytes: 1, modified: null } }

    test("returns the info of the selected source", () => {
        const state = makeState({
            source: makeSourceState([{ id: "s1", name: "s1", type: SourceType.Geojson }], { selectedIds: ["s1"] }),
            sourceInfo: { info: { s1: mvtInfo }, stats: {} },
        })
        expect(selectCurrentSourceInfo(state)).toEqual(mvtInfo)
    })

    test("returns the parent source's info for a selected source-layer node", () => {
        const mvt = makeMvtSource(MVT_ID, { sourceLayers: [{ id: "roads", name: "Roads" }] })
        const state = makeState({
            source: makeSourceState([mvt], { selectedIds: [ROADS_NODE_ID] }),
            sourceInfo: { info: { [MVT_ID]: mvtInfo }, stats: {} },
        })
        expect(selectCurrentSourceInfo(state)).toEqual(mvtInfo)
    })
})
