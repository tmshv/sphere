import { expect, it } from "vitest"
import sortFeatures from "./sort_features"

it("sortFeatures", () => {
    const features = [
        {
            geometry: { type: "LineString" },
            properties: { id: 1 },
        },
        {
            id: "medium-polygon",
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [15, 50],
                        [15, 59],
                        [35, 59],
                        [35, 50],
                        [15, 50],
                    ],
                ],
            },
        },
        {
            geometry: { type: "Point" },
            properties: { id: 3 },
        },
        {
            id: "huge-polygon",
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [58, 27],
                        [58, 68],
                        [101, 68],
                        [101, 27],
                        [58, 27],
                    ],
                ],
            },
        },
        {
            geometry: { type: "Point" },
            properties: { id: 1 },
        },
        {
            geometry: { type: "LineString" },
            properties: { id: "foo" },
        },
        {
            geometry: { type: "LineString" },
            properties: { id: "bar" },
        },
    ]

    expect(sortFeatures(features)).toEqual([
        {
            geometry: { type: "Point" },
            properties: { id: 3 },
        },
        {
            geometry: { type: "Point" },
            properties: { id: 1 },
        },
        {
            geometry: { type: "LineString" },
            properties: { id: 1 },
        },
        {
            geometry: { type: "LineString" },
            properties: { id: "foo" },
        },
        {
            geometry: { type: "LineString" },
            properties: { id: "bar" },
        },
        {
            id: "medium-polygon",
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [15, 50],
                        [15, 59],
                        [35, 59],
                        [35, 50],
                        [15, 50],
                    ],
                ],
            },
        },
        {
            id: "huge-polygon",
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [58, 27],
                        [58, 68],
                        [101, 68],
                        [101, 27],
                        [58, 27],
                    ],
                ],
            },
        },
    ])
})

function square(id, size) {
    return {
        id,
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [0, 0],
                    [0, size],
                    [size, size],
                    [size, 0],
                    [0, 0],
                ],
            ],
        },
    }
}

it("sortFeatures puts smaller polygons first regardless of input order", () => {
    const sorted = sortFeatures([square("huge", 40), square("small", 1), square("medium", 10)])
    expect(sorted.map(f => f.id)).toEqual(["small", "medium", "huge"])
})

it("sortFeatures ranks multi geometries like their single counterparts", () => {
    const multiPolygon = {
        id: "multi-polygon",
        geometry: { type: "MultiPolygon", coordinates: [square("", 1).geometry.coordinates] },
    }
    const multiLine = { id: "multi-line", geometry: { type: "MultiLineString", coordinates: [] } }
    const multiPoint = { id: "multi-point", geometry: { type: "MultiPoint", coordinates: [] } }
    const sorted = sortFeatures([square("polygon", 10), multiPolygon, multiLine, multiPoint])
    expect(sorted.map(f => f.id)).toEqual(["multi-point", "multi-line", "multi-polygon", "polygon"])
})

it("sortFeatures does not mutate the features", () => {
    const features = [square("b", 2), square("a", 1)]
    const before = JSON.parse(JSON.stringify(features))
    sortFeatures(features)
    expect(features).toEqual(before)
})
