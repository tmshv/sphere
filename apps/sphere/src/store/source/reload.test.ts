import { describe, expect, test, vi, beforeEach } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import reload from "./reload"
import { SourceType } from "@/types"
import { makeCaptureStore } from "@/testutils"

const schema = {
    columns: { name: "String" },
    points_count: 2,
    multi_points_count: 1,
    lines_count: 0,
    multi_lines_count: 0,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 3,
}

const preloadedState = {
    source: {
        items: {
            s1: {
                id: "s1",
                name: "points",
                type: SourceType.Geojson,
                format: "geojson",
                location: "file:///data/points.geojson",
                version: 0,
                fractionIndex: 0,
                editable: false,
                pending: false,
                meta: {
                    columns: {},
                    pointsCount: 0,
                    multiPointsCount: 0,
                    linesCount: 0,
                    multiLinesCount: 0,
                    polygonsCount: 0,
                    multiPolygonsCount: 0,
                    collectionsCount: 0,
                    nullGeometryCount: 0,
                    featuresCount: 0,
                },
            },
        },
        allIds: ["s1"],
    },
}

describe("reload", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
    })

    test("dispatches setGeojsonMeta with mapped schema counts for a Geojson source", async () => {
        mockInvoke.mockResolvedValue(schema)
        const { store, dispatched } = makeCaptureStore({ preloadedState })

        await store.dispatch(reload("s1"))

        const setMeta = dispatched.find(a => a.type === "source/setGeojsonMeta")
        expect(setMeta?.payload).toMatchObject({
            id: "s1",
            meta: { multiPointsCount: 1, featuresCount: 3 },
        })
    })
})
