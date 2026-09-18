import { describe, expect, test, vi, beforeEach } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import addFromUrl from "./addFromUrl"
import { SourceType } from "@/types"
import { makeCaptureStore } from "@/testutils"

const schema = {
    columns: { name: "String" },
    points_count: 2,
    multi_points_count: 0,
    lines_count: 0,
    multi_lines_count: 0,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 2,
}

describe("addFromUrl", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
    })

    test("passes the backend source_type through as format", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "points",
                    location: "file:///data/points.csv",
                    source_type: "csv",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeCaptureStore()

        await store.dispatch(addFromUrl({ url: "file:///data/points.csv", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({ id: "s1", format: "csv" })
    })

    test("falls back to geojson for an unrecognized source_type", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "x",
                    location: "file:///x.unknown",
                    source_type: "something-new",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeCaptureStore()

        await store.dispatch(addFromUrl({ url: "file:///x.unknown", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({ format: "geojson" })
    })

    test("maps the schema counts into metadata", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_add") {
                return Promise.resolve({
                    id: "s1",
                    name: "x",
                    location: "file:///x.geojson",
                    source_type: "geojson",
                })
            }
            return Promise.resolve(schema)
        })
        const { store, dispatched } = makeCaptureStore()

        await store.dispatch(addFromUrl({ url: "file:///x.geojson", type: SourceType.Geojson }))

        const added = dispatched.find(a => a.type === "source/addGeojsonSource")
        expect(added?.payload).toMatchObject({
            meta: { pointsCount: 2, featuresCount: 2, columns: { name: "String" } },
        })
    })
})
