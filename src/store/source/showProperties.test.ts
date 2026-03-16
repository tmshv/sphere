import { vi } from "vitest"
import { getProps } from "./showProperties"
import { SourceType } from "@/types"
import type { FeatureCollecionSource, GeojsonSource, RasterSource, VectorSource } from "@/types/source"
import { SourceReader } from "@/lib/source-reader"

vi.mock("@tauri-apps/api/webviewWindow")
vi.mock("@tauri-apps/api/event")
vi.mock("@/lib/tauri")
vi.mock("@/lib/source-reader", () => ({
    SourceReader: vi.fn(),
}))

const BASE = { id: "1", name: "test", fractionIndex: 0 }
const META = { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 }

function makeFeatureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
    return { type: "FeatureCollection", features }
}

function makeFeature(id: GeoJSON.Feature["id"], properties: GeoJSON.GeoJsonProperties): GeoJSON.Feature {
    return { type: "Feature", id, properties, geometry: { type: "Point", coordinates: [0, 0] } }
}

describe("getProps", () => {
    describe("FeatureCollection source", () => {
        test("returns id and props for each feature", async () => {
            const source: FeatureCollecionSource & typeof BASE = {
                ...BASE,
                type: SourceType.FeatureCollection,
                editable: true,
                pending: false,
                meta: META,
                dataset: makeFeatureCollection([
                    makeFeature("a", { foo: "bar" }),
                    makeFeature(2, { foo: "baz" }),
                ]),
            }

            const result = await getProps(source)

            expect(result).toEqual([
                { id: "a", props: { foo: "bar" } },
                { id: 2, props: { foo: "baz" } },
            ])
        })

        test("returns undefined id when feature has no id", async () => {
            const source: FeatureCollecionSource & typeof BASE = {
                ...BASE,
                type: SourceType.FeatureCollection,
                editable: true,
                pending: false,
                meta: META,
                dataset: makeFeatureCollection([
                    makeFeature(undefined, { x: 1 }),
                ]),
            }

            const result = await getProps(source)

            expect(result).toEqual([{ id: undefined, props: { x: 1 } }])
        })

        test("returns null props when feature has no properties", async () => {
            const source: FeatureCollecionSource & typeof BASE = {
                ...BASE,
                type: SourceType.FeatureCollection,
                editable: true,
                pending: false,
                meta: META,
                dataset: makeFeatureCollection([
                    makeFeature("a", null),
                ]),
            }

            const result = await getProps(source)

            expect(result).toEqual([{ id: "a", props: null }])
        })
    })

    describe("Geojson source", () => {
        test("returns id and props from loaded geojson", async () => {
            const getGeojson = vi.fn().mockResolvedValue(
                makeFeatureCollection([
                    makeFeature("x", { name: "hello" }),
                    makeFeature(42, { name: "world" }),
                ]),
            )
            vi.mocked(SourceReader).mockImplementation(function(this: any) {
                this.location = "path/to/file.geojson"
                this.getGeojson = getGeojson
            } as any)

            const source: GeojsonSource & typeof BASE = {
                ...BASE,
                type: SourceType.Geojson,
                location: "path/to/file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
                editable: true,
                pending: false,
            }

            const result = await getProps(source)

            expect(result).toEqual([
                { id: "x", props: { name: "hello" } },
                { id: 42, props: { name: "world" } },
            ])
        })

        test("returns null when geojson fails to load", async () => {
            const getGeojson = vi.fn().mockResolvedValue(null)
            vi.mocked(SourceReader).mockImplementation(function(this: any) {
                this.location = "path/to/file.geojson"
                this.getGeojson = getGeojson
            } as any)

            const source: GeojsonSource & typeof BASE = {
                ...BASE,
                type: SourceType.Geojson,
                location: "path/to/file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
                editable: true,
                pending: false,
            }

            const result = await getProps(source)

            expect(result).toBeNull()
        })
    })

    describe("unsupported source types", () => {
        test("returns null for MVT source", async () => {
            const source: VectorSource & typeof BASE = {
                ...BASE,
                type: SourceType.MVT,
                location: "https://example.com/tiles",
                tilejson: {} as any,
                editable: false,
                pending: false,
                sourceLayers: [],
            }

            const result = await getProps(source)

            expect(result).toBeNull()
        })

        test("returns null for Raster source", async () => {
            const source: RasterSource & typeof BASE = {
                ...BASE,
                type: SourceType.Raster,
                location: "https://example.com/tiles",
                editable: false,
                pending: false,
            }

            const result = await getProps(source)

            expect(result).toBeNull()
        })
    })
})
