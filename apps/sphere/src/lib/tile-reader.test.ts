import { invoke } from "@tauri-apps/api/core"
import { TileReader } from "./tile-reader"

vi.mock("@tauri-apps/api/core", { spy: true })

const mockInvoke = vi.mocked(invoke)

describe("TileReader::getTileJson", () => {
    test("parses the TileJSON returned by tiles_get_tilejson", async () => {
        const tilejson = { tilejson: "3.0.0", tiles: ["sphere://abc/tile?z={z}&x={x}&y={y}"], format: "pbf" }
        mockInvoke.mockResolvedValue(JSON.stringify(tilejson))

        const result = await new TileReader("abc").getTileJson()

        expect(result).toEqual(tilejson)
        expect(mockInvoke).toHaveBeenCalledWith("tiles_get_tilejson", { id: "abc" })
    })

    test("returns null when the source has no TileJSON", async () => {
        mockInvoke.mockRejectedValue("Source not found")

        const result = await new TileReader("abc").getTileJson()

        expect(result).toBeNull()
    })
})

describe("TileReader::getTile", () => {
    test("returns the tile bytes returned by tiles_get_tile", async () => {
        mockInvoke.mockResolvedValue([1, 2, 3])

        const result = await new TileReader("abc").getTile({ z: 1, x: 0, y: 1 })

        expect(result).toEqual(Uint8Array.from([1, 2, 3]))
        expect(mockInvoke).toHaveBeenCalledWith("tiles_get_tile", { id: "abc", z: 1, x: 0, y: 1 })
    })

    test("returns null for an empty tile", async () => {
        mockInvoke.mockResolvedValue([])

        const result = await new TileReader("abc").getTile({ z: 1, x: 0, y: 1 })

        expect(result).toBeNull()
    })
})
