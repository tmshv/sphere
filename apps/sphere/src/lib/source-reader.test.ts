import { invoke as _invoke } from "@tauri-apps/api/core"
import type { MockedFunction } from "vitest"
import { SourceReader } from "./source-reader"

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
type StringInvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<string>
const invoke = _invoke as MockedFunction<InvokeFn>

vi.mock("@tauri-apps/api/core", { spy: true })

describe("SourceReader::getGeojson", () => {
    test("should return geojson if invoke function returns data", async () => {
        const geojson = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [-90, 90],
                                [-90, -90],
                                [90, -90],
                                [90, 90],
                                [-90, 90],
                            ],
                        ],
                    },
                },
            ],
        }
        const mockInvoke = vi.fn<StringInvokeFn>().mockResolvedValue(JSON.stringify(geojson))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("XXX")
        const result = await reader.getGeojson()

        expect(result).toEqual(geojson)
        expect(mockInvoke).toHaveBeenCalledTimes(1)
        expect(mockInvoke).toHaveBeenCalledWith("source_get", {
            id: "XXX",
        })
    })

    test("should return null if invoke function throws error", async () => {
        const mockInvoke = vi.fn<InvokeFn>().mockRejectedValueOnce(new Error("test error"))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("XXX")
        const result = await reader.getGeojson()

        expect(result).toBeNull()
        expect(mockInvoke).toHaveBeenCalledTimes(1)
        expect(mockInvoke).toHaveBeenCalledWith("source_get", {
            id: "XXX",
        })
    })
})

describe("SourceReader::getInfo", () => {
    test("returns the parsed info payload", async () => {
        const mockInvoke = vi.fn<InvokeFn>().mockResolvedValue({
            file: { size_bytes: 4096, modified: "1758153600" },
            schema: { columns: {}, points_count: 0 },
            details: { format: "geojson" },
        })
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("s1")
        const info = await reader.getInfo()

        expect(mockInvoke).toHaveBeenCalledWith("source_get_info", { id: "s1" })
        expect(info?.details.format).toBe("geojson")
    })

    test("returns null when the command fails", async () => {
        const mockInvoke = vi.fn<InvokeFn>().mockRejectedValueOnce(new Error("boom"))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("s1")

        expect(await reader.getInfo()).toBeNull()
    })
})

describe("SourceReader::setCsvGeometry", () => {
    test("forwards the params", async () => {
        const mockInvoke = vi.fn<InvokeFn>().mockResolvedValue({ columns: {}, points_count: 2 })
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("s1")
        await reader.setCsvGeometry({ mode: "xy", xColumn: "lng", yColumn: "lat" })

        expect(mockInvoke).toHaveBeenCalledWith("source_set_csv_geometry", {
            id: "s1",
            mode: "xy",
            wktColumn: null,
            xColumn: "lng",
            yColumn: "lat",
        })
    })

    test("rethrows so the caller can keep the staged input", async () => {
        const mockInvoke = vi
            .fn<InvokeFn>()
            .mockRejectedValueOnce(new Error("xy mode requires both an x column and a y column"))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("s1")

        await expect(reader.setCsvGeometry({ mode: "xy", xColumn: "lng" })).rejects.toThrow("xy mode requires both")
    })
})

describe("SourceReader::getColumnStats", () => {
    test("forwards topN when given", async () => {
        const mockInvoke = vi
            .fn<InvokeFn>()
            .mockResolvedValue({ column: "a", col_type: "String", count: 1, null_count: 0 })
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("s1")
        await reader.getColumnStats("a", undefined, 25)

        expect(mockInvoke).toHaveBeenCalledWith("source_get_column_stats", {
            id: "s1",
            column: "a",
            ids: undefined,
            topN: 25,
        })
    })
})
