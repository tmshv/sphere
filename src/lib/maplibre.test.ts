import { sourceLayerProp, visibility } from "./maplibre"

describe("visibility", () => {
    it("should return 'visible' when the input is true", () => {
        expect(visibility(true)).toBe("visible")
    })

    it("should return 'none' when the input is false", () => {
        expect(visibility(false)).toBe("none")
    })
})

describe("sourceLayerProp", () => {
    it("should return an empty object when the input is undefined", () => {
        expect(sourceLayerProp(undefined)).toEqual({})
    })

    it("should return an object with 'source-layer' property when the input is a string", () => {
        const value = "some-layer"
        expect(sourceLayerProp(value)).toEqual({ "source-layer": value })
    })

    it("should return an object with 'source-layer' property when the input is null", () => {
        expect(sourceLayerProp(null)).toEqual({})
    })
})
