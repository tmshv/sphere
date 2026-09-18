import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { makeCaptureStore } from "@/testutils"
import { actions } from "../actions"
import listener from "./apply-csv-geometry"

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

function makeStore() {
    return makeCaptureStore({ middleware: listener.middleware })
}

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

const apply = () =>
    actions.sourceInfo.applyCsvGeometry({
        id: "s1",
        mode: "xy" as const,
        xColumn: "longitude",
        yColumn: "latitude",
    })

describe("apply-csv-geometry listener", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
        mockInvoke.mockResolvedValue(schema)
    })

    test("invokes source_set_csv_geometry with the staged params", async () => {
        const { store } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(mockInvoke).toHaveBeenCalledWith("source_set_csv_geometry", {
            id: "s1",
            mode: "xy",
            wktColumn: null,
            xColumn: "longitude",
            yColumn: "latitude",
        })
    })

    test("dispatches setGeojsonMeta with the returned schema", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        const meta = dispatched.find(a => a.type === "source/setGeojsonMeta")
        expect(meta?.payload).toMatchObject({ id: "s1", meta: { pointsCount: 2, featuresCount: 2 } })
    })

    test("dispatches bumpVersion so the map re-fetches", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "source/bumpVersion")).toBe(true)
    })

    test("clears the selection because feature ids were reassigned", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "selection/reset")).toBe(true)
    })

    test("invalidates the cached stats for that source", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        const invalidate = dispatched.find(a => a.type === "sourceInfo/invalidate")
        expect(invalidate?.payload).toBe("s1")
    })

    test("reports the error and changes nothing when the command rejects", async () => {
        mockInvoke.mockRejectedValue(new Error("xy mode requires both an x column and a y column"))
        const { store, dispatched } = makeStore()

        store.dispatch(apply())
        await flush()

        expect(dispatched.some(a => a.type === "error/setError")).toBe(true)
        expect(dispatched.some(a => a.type === "source/bumpVersion")).toBe(false)
        expect(dispatched.some(a => a.type === "source/setGeojsonMeta")).toBe(false)
        expect(dispatched.some(a => a.type === "selection/reset")).toBe(false)
    })
})
