import { jest, describe, expect, test } from "@jest/globals"
import { invoke as _invoke } from "@tauri-apps/api"
import { SourceReader } from "./source-reader"

type InvokeFn = typeof _invoke<string>
jest.mock("@tauri-apps/api")

const invoke = _invoke as jest.MockedFunction<InvokeFn>

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
        const mock: InvokeFn = jest.fn<InvokeFn>().mockResolvedValueOnce(JSON.stringify(geojson))
        invoke.mockImplementation(mock)

        const reader = new SourceReader("sphere://source/XXX")
        const result = await reader.getGeojson()

        expect(result).toEqual(geojson)
        expect(mock).toHaveBeenCalledWith("source_get", {
            id: "XXX",
        })
    })

    test("should return null if invoke function throws error", async () => {
        const mockInvoke = jest.fn<InvokeFn>().mockRejectedValueOnce(new Error("test error"))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("sphere://source/XXX")
        const result = await reader.getGeojson()

        expect(result).toBeNull()
        expect(mockInvoke).toHaveBeenCalledWith("source_get", {
            id: "XXX",
        })
    })
})
