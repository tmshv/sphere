import { vi, describe, expect, test } from "vitest"
import type { MockedFunction } from "vitest"
import { invoke as _invoke } from "@tauri-apps/api/core"
import { SourceReader } from "./source-reader"

type InvokeFn = typeof _invoke<string>
const invoke = _invoke as MockedFunction<InvokeFn>

vi.mock("@tauri-apps/api/core", { spy: true })

describe("SourceReader", () => {
    test("should store input value in path property", () => {
        const reader = new SourceReader("./path/to/test/shape.shp")

        expect(reader.location).toEqual("./path/to/test/shape.shp")
    })
})

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
        const mockInvoke = vi.fn<InvokeFn>().mockResolvedValue(JSON.stringify(geojson))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("sphere://source/XXX")
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

        const reader = new SourceReader("sphere://source/XXX")
        const result = await reader.getGeojson()

        expect(result).toBeNull()
        expect(mockInvoke).toHaveBeenCalledTimes(1)
        expect(mockInvoke).toHaveBeenCalledWith("source_get", {
            id: "XXX",
        })
    })
})
