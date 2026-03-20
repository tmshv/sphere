import { LayerType } from "@/types"
import predictLayerType from "./predict-layer-type"

describe("predictLayerType", () => {
    it("should return Point when there are points but no lines or polygons", () => {
        const result = predictLayerType({ columns: {}, pointsCount: 1, linesCount: 0, polygonsCount: 0 })
        expect(result).toBe(LayerType.Point)
    })

    it("should return Line when there are only lines", () => {
        const result = predictLayerType({ columns: {}, pointsCount: 0, linesCount: 1, polygonsCount: 0 })
        expect(result).toBe(LayerType.Line)
    })

    it("should return Polygon when there are only polygons", () => {
        const result = predictLayerType({ columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 1 })
        expect(result).toBe(LayerType.Polygon)
    })

    it("should return undefined when there is a mix of point, line, and polygon data", () => {
        const result = predictLayerType({ columns: {}, pointsCount: 1, linesCount: 1, polygonsCount: 1 })
        expect(result).toBeUndefined()
    })

    it("should return undefined when all counts are zero", () => {
        const result = predictLayerType({ columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 })
        expect(result).toBeUndefined()
    })
})
