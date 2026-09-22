import { describe, expect, test } from "vitest"
import { DEFAULT_SOURCE_FORMAT, isSourceFormat } from "./source-format"

describe("isSourceFormat", () => {
    test.each(["geojson", "csv", "shapefile", "gpx"])("accepts %s", value => {
        expect(isSourceFormat(value)).toBe(true)
    })

    test.each(["mbtiles", "GeoJSON", "", "raster"])("rejects %s", value => {
        expect(isSourceFormat(value)).toBe(false)
    })

    test("default format is geojson", () => {
        expect(DEFAULT_SOURCE_FORMAT).toBe("geojson")
    })
})
