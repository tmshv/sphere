import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectCurrentSourceFields, selectCurrentSourceMeta } from "./selectors"

const makeState = (overrides: object = {}) =>
    ({
        source: { items: {}, allIds: [], selectedId: "s1" },
        sourceInfo: { info: {}, stats: {} },
        ...overrides,
    }) as never

describe("selectCurrentSourceFields", () => {
    test("returns an empty array when nothing is selected", () => {
        const state = makeState({ source: { items: {}, allIds: [] } })
        expect(selectCurrentSourceFields(state)).toEqual([])
    })

    test("marks a column with no stats yet as loading", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { name: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: { info: {}, stats: {} },
        })
        const fields = selectCurrentSourceFields(state)
        expect(fields).toHaveLength(1)
        expect(fields[0]?.summary.kind).toBe("loading")
    })

    test("builds a numeric summary from a histogram", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { elevation: "Number" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
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
            source: {
                items: { s1: { id: "s1", meta: { columns: { region: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
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
            source: {
                items: { s1: { id: "s1", type: SourceType.Raster } },
                allIds: ["s1"],
                selectedId: "s1",
            },
        })
        expect(selectCurrentSourceMeta(state)).toBeNull()
    })

    test("selectCurrentSourceMeta returns the metadata when present", () => {
        const meta = { columns: {}, pointsCount: 3, featuresCount: 3 }
        const state = makeState({
            source: { items: { s1: { id: "s1", meta } }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectCurrentSourceMeta(state)).toEqual(meta)
    })

    test("sorts fields by name", () => {
        const state = makeState({
            source: {
                items: { s1: { id: "s1", meta: { columns: { zebra: "String", alpha: "String" } } } },
                allIds: ["s1"],
                selectedId: "s1",
            },
            sourceInfo: { info: {}, stats: {} },
        })
        expect(selectCurrentSourceFields(state).map(f => f.name)).toEqual(["alpha", "zebra"])
    })
})
