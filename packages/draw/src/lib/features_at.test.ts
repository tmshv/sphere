import { describe, expect, it, vi } from "vitest"
import featuresAt, { type FeaturesAtContext } from "./features_at"

type QueryRenderedFeatures = FeaturesAtContext["map"]["queryRenderedFeatures"]

/** The buffers are read only when an event is given; these tests pass a bounding box instead. */
const NO_BUFFER = 0

function createMockContext() {
    return {
        options: { clickBuffer: NO_BUFFER, touchBuffer: NO_BUFFER },
        map: {
            queryRenderedFeatures: vi.fn<QueryRenderedFeatures>().mockReturnValue([
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
