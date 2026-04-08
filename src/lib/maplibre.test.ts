import type { FilterSpecification } from "maplibre-gl"
import {
    assignFeatureIds,
    combineFilters,
    isExpressionFilter,
    isValidFilterExpression,
    serializeFeaturesForIpc,
    sourceLayerProp,
    visibility,
} from "./maplibre"

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

describe("isExpressionFilter", () => {
    it("should return true for modern equality expression", () => {
        expect(isExpressionFilter(["==", ["get", "type"], "airport"] as FilterSpecification)).toBe(true)
    })

    it("should return false for legacy bare-string comparison", () => {
        expect(isExpressionFilter(["==", "type", "airport"] as FilterSpecification)).toBe(false)
    })

    it("should return false for legacy $id key", () => {
        expect(isExpressionFilter(["==", "$id", 42] as FilterSpecification)).toBe(false)
    })

    it("should return false for legacy $type key", () => {
        expect(isExpressionFilter(["==", "$type", "Point"] as FilterSpecification)).toBe(false)
    })

    it("should return false for !in operator", () => {
        expect(isExpressionFilter(["!in", ["get", "type"], ["literal", ["a"]]] as unknown as FilterSpecification)).toBe(
            false,
        )
    })

    it("should return false for !has operator", () => {
        expect(isExpressionFilter(["!has", "elevation"] as FilterSpecification)).toBe(false)
    })

    it("should return false for none operator", () => {
        expect(isExpressionFilter(["none", ["has", "elevation"]] as FilterSpecification)).toBe(false)
    })

    it("should return true for modern in with expression haystack", () => {
        expect(isExpressionFilter(["in", ["get", "type"], ["literal", ["a", "b"]]] as FilterSpecification)).toBe(true)
    })

    it("should return false for legacy in with scalar haystack", () => {
        expect(isExpressionFilter(["in", "type", "airport"] as FilterSpecification)).toBe(false)
    })

    it("should return true for all with modern sub-filters", () => {
        expect(
            isExpressionFilter([
                "all",
                ["==", ["get", "type"], "airport"],
                ["has", "elevation"],
            ] as FilterSpecification),
        ).toBe(true)
    })

    it("should return false for all containing a legacy sub-filter", () => {
        expect(isExpressionFilter(["all", ["==", "type", "airport"]] as FilterSpecification)).toBe(false)
    })
})

describe("isValidFilterExpression", () => {
    it("should return true for a valid equality expression", () => {
        expect(isValidFilterExpression(["==", ["get", "type"], "airport"])).toBe(true)
    })

    it("should return false for a legacy filter", () => {
        expect(isValidFilterExpression(["==", "type", "airport"])).toBe(false)
    })

    it("should return false for an operator with no operands", () => {
        expect(isValidFilterExpression(["=="])).toBe(false)
    })

    it("should return false for an unknown operator", () => {
        expect(isValidFilterExpression(["notanoperator", "field", "value"])).toBe(false)
    })
})

describe("serializeFeaturesForIpc", () => {
    it("deduplicates features by id", () => {
        const features = [
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 2, geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result).toHaveLength(2)
    })

    it("drops features without numeric id", () => {
        const features = [
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
            { type: "Feature", id: "abc", geometry: { type: "Point", coordinates: [2, 2] }, properties: {} },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(1)
    })

    it("strips non-GeoJSON properties (layer, source, sourceLayer, state)", () => {
        const features = [
            {
                type: "Feature",
                id: 1,
                geometry: { type: "Point", coordinates: [0, 0] },
                properties: { name: "test" },
                layer: { id: "layer1" },
                source: "my-source",
                sourceLayer: "sl",
                state: { selected: true },
            },
        ]
        const result = JSON.parse(serializeFeaturesForIpc(features as never[]))
        expect(result[0].layer).toBeUndefined()
        expect(result[0].source).toBeUndefined()
        expect(result[0].sourceLayer).toBeUndefined()
        expect(result[0].state).toBeUndefined()
        expect(result[0].properties.name).toBe("test")
    })
})

describe("assignFeatureIds", () => {
    it("keeps existing numeric ids and deduplicates", () => {
        const features = [
            { type: "Feature", id: 3, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 3, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", id: 7, geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
        ]
        const result = assignFeatureIds(features as never[])
        expect(result.ids).toEqual([3, 7])
        expect(result.fc.features).toHaveLength(2)
    })

    it("assigns sequential ids to features without numeric id (starting from 1)", () => {
        const features = [
            { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
        ]
        const result = assignFeatureIds(features as never[])
        expect(result.ids).toEqual([1, 2])
    })

    it("assigns ids starting after max existing id", () => {
        const features = [
            { type: "Feature", id: 10, geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
            { type: "Feature", geometry: { type: "Point", coordinates: [1, 1] }, properties: {} },
        ]
        const result = assignFeatureIds(features as never[])
        expect(result.ids).toEqual([10, 11])
    })

    it("returns empty for empty input", () => {
        const result = assignFeatureIds([])
        expect(result.ids).toEqual([])
        expect(result.json).toBe("[]")
        expect(result.fc.features).toHaveLength(0)
    })

    it("strips non-GeoJSON properties (layer, source, sourceLayer, state)", () => {
        const features = [
            {
                type: "Feature",
                id: 1,
                geometry: { type: "Point", coordinates: [0, 0] },
                properties: { name: "test" },
                layer: { id: "layer1" },
                source: "my-source",
                sourceLayer: "sl",
                state: { selected: true },
            },
        ]
        const result = assignFeatureIds(features as never[])
        const feat = result.fc.features[0]
        expect((feat as Record<string, unknown>).layer).toBeUndefined()
        expect((feat as Record<string, unknown>).source).toBeUndefined()
        expect((feat as Record<string, unknown>).sourceLayer).toBeUndefined()
        expect((feat as Record<string, unknown>).state).toBeUndefined()
        expect(feat.properties?.name).toBe("test")
    })

    it("builds a valid FeatureCollection via fc property", () => {
        const features = [
            { type: "Feature", id: 1, geometry: { type: "Point", coordinates: [0, 0] }, properties: { a: 1 } },
        ]
        const result = assignFeatureIds(features as never[])
        expect(result.fc.type).toBe("FeatureCollection")
        expect(result.fc.features[0].type).toBe("Feature")
        expect(result.fc.features[0].id).toBe(1)
        expect(result.fc.features[0].properties?.a).toBe(1)
        expect(result.json).toBe(JSON.stringify(result.fc.features))
    })
})

describe("combineFilters", () => {
    it("should return base filter when called with single filter", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]] as FilterSpecification
        expect(combineFilters(base)).toEqual(base)
    })

    it("should combine base and user filter with 'all'", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]] as FilterSpecification
        const user = ["==", ["get", "type"], "airport"] as FilterSpecification
        expect(combineFilters(base, user)).toEqual(["all", base, user])
    })

    it("should flatten user filter when it is an 'all' expression", () => {
        const base = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]] as FilterSpecification
        const user = ["all", ["==", ["get", "type"], "airport"], [">=", ["get", "pop"], 1000]] as FilterSpecification
        expect(combineFilters(base, user)).toEqual([
            "all",
            base,
            ["==", ["get", "type"], "airport"],
            [">=", ["get", "pop"], 1000],
        ])
    })
})
