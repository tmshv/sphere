import { describe, expect, test } from "@jest/globals"
import { isDate, isInt, isNumeric, isUrl, predictType } from "./predict-data-type"

describe("isInt", () => {
    test("returns true for int values", () => {
        expect(isInt(0)).toBe(true)
        expect(isInt(1)).toBe(true)
        expect(isInt(-1)).toBe(true)
        expect(isInt(123)).toBe(true)
        expect(isInt(-456)).toBe(true)
    })

    test("returns false for float values", () => {
        expect(isInt(0.5)).toBe(false)
        expect(isInt(1.3425)).toBe(false)
        expect(isInt(-2.7)).toBe(false)
        expect(isInt(-230.00001)).toBe(false)
        expect(isInt(NaN)).toBe(false)
        expect(isInt(Infinity)).toBe(false)
        expect(isInt(-Infinity)).toBe(false)
    })
})

describe("isNumeric", () => {
    test("should return true for valid numeric strings", () => {
        expect(isNumeric("123")).toBe(true)
        expect(isNumeric("-123")).toBe(true)
        expect(isNumeric("123.45")).toBe(true)
        expect(isNumeric("-123.45")).toBe(true)
        expect(isNumeric("1e3")).toBe(true)
        expect(isNumeric("-1e3")).toBe(true)
        expect(isNumeric("1.23e-4")).toBe(true)
        expect(isNumeric("-1.23e-4")).toBe(true)
        expect(isNumeric("-13.798e+8")).toBe(true)
    })

    test("should return false for invalid numeric strings", () => {
        expect(isNumeric("")).toBe(false)
        expect(isNumeric("abc")).toBe(false)
        expect(isNumeric("123abc")).toBe(false)
        expect(isNumeric("1.23.45")).toBe(false)
        expect(isNumeric("-1e-3.45")).toBe(false)
    })
})

describe("isDate", () => {
    test("should return true for ISO 8601 format date string", () => {
        expect(isDate("2023-05-04T18:11:55.439Z")).toBeTruthy()
    })

    test("should return true for valid date string", () => {
        expect(isDate("01 Jan 1970 00:00:00 GMT")).toBeTruthy()
        expect(isDate("04 Dec 1995 00:12:00 GMT")).toBeTruthy()
    })

    test("should return true for date of form YYYY-mm-dd", () => {
        expect(isDate("2021-01-01")).toBeTruthy()
    })

    // test("should return true for date of form YYYYmmdd", () => {
    //     expect(isDate("20230504")).toBeTruthy()
    //     expect(isDate("20000101")).toBeTruthy()
    //     expect(isDate("20220224")).toBeTruthy()
    // })

    test("should return false for an invalid date string", () => {
        expect(isDate("not a date")).toBeFalsy()

        expect(isDate("202305042")).toBeFalsy()
        expect(isDate("202011.0")).toBeFalsy()
    })

    test("should return false for an empty string", () => {
        expect(isDate("")).toBeFalsy()
    })

    // test("should return false for bad date of form YYYYmmdd", () => {
    //     expect(isDate("00230504")).toBeFalsy()
    //     expect(isDate("20201501")).toBeFalsy()
    //     expect(isDate("20220284")).toBeFalsy()
    // })

    test("should return false for bad date of form YYYY-mm-dd", () => {
        expect(isDate("2020-15-01")).toBeFalsy()
        expect(isDate("2022-02-84")).toBeFalsy()
    })
})

describe("isUrl", () => {
    test("should return true for valid URL", () => {
        expect(isUrl("https://github.com/tmshv/sphere")).toBeTruthy()
        expect(isUrl("https://planet.osm.org")).toBeTruthy()
        expect(isUrl("https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/ne_10m_ocean.zip")).toBeTruthy()
        expect(isUrl("https://planet.osm.org/pbf/planet-latest.osm.pbf.torrent")).toBeTruthy()
        expect(isUrl("https://tile.openstreetmap.org/8/89/98.png")).toBeTruthy()
        expect(isUrl("https://api.mapbox.com/styles/v1/mapbox/streets-v9?access_token=XXX")).toBeTruthy()
    })

    test("should return true for mapbox URL", () => {
        expect(isUrl("mapbox://styles/mapbox/streets-v9")).toBeTruthy()
        expect(isUrl("mapbox://styles/mapbox/satellite-streets-v12")).toBeTruthy()
    })

    test("should return true for non-URL", () => {
        expect(isUrl("")).toBeFalsy()
        expect(isUrl("non-url-value")).toBeFalsy()
    })
})

describe("predictType", () => {
    test("should return 'empty' for empty samples", () => {
        expect(predictType("k", [])).toBe("empty")
    })

    test("should return 'mixed' for array samples", () => {
        const samples = [
            { k: ["value-01"] },
            { k: ["value-02"] },
            { k: ["value-03"] },
        ]
        expect(predictType("k", samples)).toBe("mixed")
    })

    test("should return 'int' for int samples", () => {
        const samples = [
            { k: "8" },
            { k: "7" },
            { k: "3" },
            { k: "9" },
            { k: "0" },
            { k: "1" },
        ]
        expect(predictType("k", samples)).toBe("int")
    })

    test("should return 'int' for int samples", () => {
        const samples = [
            { k: "3.8" },
            { k: "0.17" },
            { k: "-3.23" },
        ]
        expect(predictType("k", samples)).toBe("float")
    })

    test("should return 'date' for date samples", () => {
        const samples = [
            { k: "2023-05-04T18:11:55.439Z" },
            { k: "2023-05-05" },
        ]
        expect(predictType("k", [samples[0]])).toBe("date")
        expect(predictType("k", [samples[1]])).toBe("date")
    })

    test("should return 'url' for url samples", () => {
        const samples = [
            { k: "https://api.example.com/images/image-01.png" },
            { k: "https://api.example.com/images/image-02.png" },
            { k: "https://api.example.com/images/image-03.png" },
            { k: "https://api.example.com/images/image-04.png" },
        ]
        expect(predictType("k", samples)).toBe("url")
    })

    test("should return 'string' for string samples", () => {
        const samples = [
            { k: "this" },
            { k: "is" },
            { k: "just" },
            { k: "text" },
        ]
        expect(predictType("k", samples)).toBe("string")
    })

    test("should return 'unknown' for other samples", () => {
        const samples = [
            { k: null as unknown as string },
        ]
        expect(predictType("k", samples)).toBe("unknown")
    })
})

