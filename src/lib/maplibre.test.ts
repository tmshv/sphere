import type { FilterSpecification } from "maplibre-gl"
import { combineFilters, isExpressionFilter, isValidFilterExpression, sourceLayerProp, visibility } from "./maplibre"

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
        expect(isExpressionFilter(["!in", ["get", "type"], ["literal", ["a"]]] as unknown as FilterSpecification)).toBe(false)
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
