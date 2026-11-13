import { describe, expect, it, vi } from "vitest"
import featuresAt from "../src/lib/features_at"

function createMockContext() {
    return {
        options: {},
        map: {
            queryRenderedFeatures: vi.fn().mockReturnValue([
                {
                    type: "Feature",
                    properties: {
                        meta: "feature",
                        id: "foo",
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            [0, 0],
                            [1, 1],
                            [2, 2],
                        ],
                    },
                },
                {
                    type: "Feature",
                    properties: {
                        meta: "nothing",
                        id: "bar",
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [1, 1],
                                [2, 2],
                                [3, 3],
                                [4, 4],
                                [1, 1],
                            ],
                        ],
                    },
                },
                {
                    type: "Feature",
                    properties: {
                        meta: "vertex",
                        id: "baz",
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [10, 10],
                    },
                },
                {
                    type: "Feature",
                    properties: {
                        meta: "vertex",
                        id: "baz",
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [10, 10],
                    },
                },
            ]),
        },
    }
}

const expectedResult = [
    {
        type: "Feature",
        properties: {
            meta: "vertex",
            id: "baz",
        },
        geometry: {
            type: "Point",
            coordinates: [10, 10],
        },
    },
    {
        type: "Feature",
        properties: {
            meta: "feature",
            id: "foo",
        },
        geometry: {
            type: "LineString",
            coordinates: [
                [0, 0],
                [1, 1],
                [2, 2],
            ],
        },
    },
]

describe("featuresAt", () => {
    it("featuresAt with click bounding box", () => {
        const mockContext = createMockContext()
        const result = featuresAt.click(
            null,
            [
                [10, 10],
                [20, 20],
            ],
            mockContext,
        )

        expect(mockContext.map.queryRenderedFeatures).toHaveBeenCalledTimes(1)
        expect(mockContext.map.queryRenderedFeatures).toHaveBeenNthCalledWith(
            1,
            [
                [10, 10],
                [20, 20],
            ],
            {},
        )
        expect(result, "sorts, filters based on properties.meta, removes duplicates").toEqual(expectedResult)
    })

    it("featuresAt with touch bounding box", () => {
        const mockContext = createMockContext()
        const result = featuresAt.touch(
            null,
            [
                [10, 10],
                [20, 20],
            ],
            mockContext,
        )

        expect(mockContext.map.queryRenderedFeatures).toHaveBeenCalledTimes(1)
        expect(mockContext.map.queryRenderedFeatures).toHaveBeenNthCalledWith(
            1,
            [
                [10, 10],
                [20, 20],
            ],
            {},
        )
        expect(result, "sorts, filters based on properties.meta, removes duplicates").toEqual(expectedResult)
    })
})
