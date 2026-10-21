import type { RequestParameters } from "maplibre-gl"
import { MbtilesReader } from "./mbtiles"
import { SourceReader } from "./source-reader"
import { SphereProtocol } from "./sphere-protocol"

vi.mock("./mbtiles", () => ({
    MbtilesReader: vi.fn(),
}))

vi.mock("./source-reader", () => ({
    SourceReader: vi.fn(),
}))

const getTileJson = vi.fn()
const getTile = vi.fn()
const getGeojson = vi.fn()

function request(url: string): Promise<{ data: unknown }> {
    const params: RequestParameters = { url }
    return new SphereProtocol().createHandler()(params, new AbortController())
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(MbtilesReader).mockImplementation(function MockMbtilesReader() {
        return Object.assign(Object.create(MbtilesReader.prototype), { getTileJson, getTile })
    })
    vi.mocked(SourceReader).mockImplementation(function MockSourceReader() {
        return Object.assign(Object.create(SourceReader.prototype), { getGeojson })
    })
})

describe("SphereProtocol::parseZXY", () => {
    test("should parse z, x and y from search params", () => {
        const url = new URL("sphere://abc/tile?z=3&x=5&y=7")

        expect(new SphereProtocol().parseZXY(url)).toEqual([3, 5, 7])
    })

    test("should default missing params to 0", () => {
        const url = new URL("sphere://abc/tile")

        expect(new SphereProtocol().parseZXY(url)).toEqual([0, 0, 0])
    })
})

describe("SphereProtocol::createHandler", () => {
    test("should return tilejson for /tilejson", async () => {
        const tilejson = { tilejson: "3.0.0", tiles: ["sphere://abc/tile?z={z}&x={x}&y={y}"] }
        getTileJson.mockResolvedValue(tilejson)

        const result = await request("sphere://abc/tilejson")

        expect(MbtilesReader).toHaveBeenCalledWith("abc")
        expect(result).toEqual({ data: tilejson })
    })

    test("should reject when tilejson is missing", async () => {
        getTileJson.mockResolvedValue(null)

        await expect(request("sphere://abc/tilejson")).rejects.toThrow("abc")
    })

    test("should return tile bytes for /tile", async () => {
        const bytes = Uint8Array.from([1, 2, 3])
        getTile.mockResolvedValue(bytes)

        const result = await request("sphere://abc/tile?z=1&x=2&y=3")

        expect(getTile).toHaveBeenCalledWith({ z: 1, x: 2, y: 3 })
        expect(result).toEqual({ data: bytes.buffer })
    })

    test("should return an empty buffer when the tile is missing", async () => {
        getTile.mockResolvedValue(null)

        const result = await request("sphere://abc/tile?z=1&x=2&y=3")

        expect(result.data).toBeInstanceOf(ArrayBuffer)
        expect(result.data).toHaveProperty("byteLength", 0)
    })

    test("should return geojson for the source root", async () => {
        const geojson = { type: "FeatureCollection", features: [] }
        getGeojson.mockResolvedValue(geojson)

        const result = await request("sphere://abc")

        expect(SourceReader).toHaveBeenCalledWith("abc")
        expect(result).toEqual({ data: geojson })
    })

    test("should reject when geojson is missing", async () => {
        getGeojson.mockResolvedValue(null)

        await expect(request("sphere://abc")).rejects.toThrow("abc")
    })
})
