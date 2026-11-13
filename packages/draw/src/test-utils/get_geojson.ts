import type {
    Feature,
    FeatureCollection,
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
} from "geojson"
import jsonClone from "../lib/json_clone"
import type { FeatureProperties } from "../types"

/** The GeoJSON fixtures `getGeoJSON` hands out, by name. */
export interface GeoJSONFixtures {
    multiPolygon: Feature<MultiPolygon, FeatureProperties>
    multiPolygon2: Feature<MultiPolygon, FeatureProperties>
    line: Feature<LineString, FeatureProperties>
    line2: Feature<LineString, FeatureProperties>
    multiLineString: Feature<MultiLineString, FeatureProperties>
    multiPoint: Feature<MultiPoint, FeatureProperties>
    point: Feature<Point, FeatureProperties>
    point2: Feature<Point, FeatureProperties>
    negativePoint: Feature<Point, FeatureProperties>
    polygon: Feature<Polygon, FeatureProperties>
    polygon2: Feature<Polygon, FeatureProperties>
    square: Feature<Polygon, FeatureProperties>
    nullGeometry: Feature<null, FeatureProperties>
    geometryCollection: Feature<GeometryCollection<Polygon>, FeatureProperties>
    featureCollection: FeatureCollection<Polygon, FeatureProperties>
}

export type GeoJSONFixtureName = keyof GeoJSONFixtures

/** Fixtures that are a single feature with a geometry Draw can edit. */
export type DrawableFixtureName = Exclude<
    GeoJSONFixtureName,
    "nullGeometry" | "geometryCollection" | "featureCollection"
>

const features: GeoJSONFixtures = {
    multiPolygon: {
        type: "Feature",
        properties: { a: "b", c: "d" },
        geometry: {
            type: "MultiPolygon",
            coordinates: [
                [
                    [
                        [1, 1],
                        [2, 2],
                        [2, 6],
                        [4, 3],
                        [1, 1],
                    ],
                ],
            ],
        },
    },

    multiPolygon2: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "MultiPolygon",
            coordinates: [
                [
                    [
                        [1, 1],
                        [2, 2],
                        [4, 3],
                        [1, 1],
                    ],
                ],
                [
                    [
                        [30, 20],
                        [50, 40],
                        [70, 30],
                        [30, 20],
                    ],
                ],
            ],
        },
    },

    line: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [0, 0],
                [1, 1],
                [2, 2],
            ],
        },
    },

    line2: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: [
                [3, 3],
                [5, 5],
                [7, 7],
            ],
        },
    },

    multiLineString: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "MultiLineString",
            coordinates: [
                [
                    [20, 20],
                    [21, 21],
                    [22, 22],
                ],
                [
                    [30, 30],
                    [31, 31],
                    [32, 32],
                ],
            ],
        },
    },

    multiPoint: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "MultiPoint",
            coordinates: [
                [-5, -5],
                [-10, -10],
            ],
        },
    },

    point: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Point",
            coordinates: [10, 10],
        },
    },

    point2: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Point",
            coordinates: [20, 40],
        },
    },

    negativePoint: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Point",
            coordinates: [-10, -10],
        },
    },

    polygon: {
        type: "Feature",
        properties: { a: "b", c: "d" },
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [30, 20],
                    [50, 40],
                    [70, 30],
                    [50, 20],
                    [30, 20],
                ],
            ],
        },
    },

    polygon2: {
        type: "Feature",
        properties: { a2: "b2", c2: "d2" },
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [40, 30],
                    [60, 50],
                    [90, 90],
                    [100, 80],
                    [40, 30],
                ],
            ],
        },
    },

    square: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [1, 1],
                    [1, 2],
                    [2, 2],
                    [2, 1],
                    [1, 1],
                ],
            ],
        },
    },

    nullGeometry: {
        type: "Feature",
        properties: {},
        geometry: null,
    },

    geometryCollection: {
        type: "Feature",
        properties: {},
        geometry: {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "Polygon",
                    coordinates: [
                        [
                            [30, 20],
                            [50, 40],
                            [70, 30],
                            [50, 20],
                            [30, 20],
                        ],
                    ],
                },
            ],
        },
    },

    featureCollection: {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                properties: {},
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
        ],
    },
}

/** A fresh deep copy of the named fixture, safe to mutate. */
export default function getGeoJSON<K extends GeoJSONFixtureName>(type: K): GeoJSONFixtures[K] {
    return jsonClone(features[type])
}
