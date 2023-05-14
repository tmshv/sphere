import { jest, describe, expect, test } from "@jest/globals"
import { invoke as _invoke } from "@tauri-apps/api"
import { SourceReader } from "./shape"

type InvokeFn = typeof _invoke<string>
jest.mock("@tauri-apps/api")

const invoke = _invoke as jest.MockedFunction<InvokeFn>

describe("ShapeReader", () => {
    test("should store input value in path property", () => {
        const reader = new SourceReader("./path/to/test/shape.shp")

        expect(reader.location).toEqual("./path/to/test/shape.shp")
    })
})

describe("ShapeReader::getGeojson", () => {
    test("should return geojson data if invoke function returns data", async () => {
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

        const reader = new SourceReader("test/path")
        const result = await reader.getGeojson()

        expect(result).toEqual(geojson)
        expect(mock).toHaveBeenCalledWith("shape_get_geojson", {
            path: "test/path",
        })
    })

    test("should return null if invoke function throws error", async () => {
        const mockInvoke = jest.fn<InvokeFn>().mockRejectedValueOnce(new Error("test error"))
        invoke.mockImplementation(mockInvoke)

        const reader = new SourceReader("test/path")
        const result = await reader.getGeojson()

        expect(result).toBeNull()
        expect(mockInvoke).toHaveBeenCalledWith("shape_get_geojson", {
            path: "test/path",
        })
    })
})
