import type { FilterSpecification } from "maplibre-gl"
import { featureFilter } from "@maplibre/maplibre-gl-style-spec"
import {
    combineFilters,
    excludeIdsFilter,
    isExpressionFilter,
    isValidFilterExpression,
    layerOrderMoves,
    lineStringLayerIds,
    polygonLayerIds,
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

describe("excludeIdsFilter", () => {
    const GLOBALS = { zoom: 0 }
    // Where the expression sits in the style; featureFilter needs it for error messages
    const ROOT_KEY = "filter"

    function shown(filter: FilterSpecification | undefined, id: number | string | undefined): boolean {
        if (filter === undefined) {
            return true
        }
        const compiled = featureFilter(filter, ROOT_KEY)
        return compiled.filter(GLOBALS, { type: 1, id, properties: {}, geometry: [] })
    }

    it("is no filter when no id is hidden", () => {
        expect(excludeIdsFilter([])).toBeUndefined()
    })

    it("matches the feature id against the hidden ids", () => {
        expect(excludeIdsFilter([3, 1])).toEqual(["match", ["id"], [1, 3], false, true])
    })

    it("lists each id once", () => {
        expect(excludeIdsFilter([2, 2, 1])).toEqual(["match", ["id"], [1, 2], false, true])
    })

    it("hides exactly the given numeric ids when MapLibre evaluates it", () => {
        // featureFilter throws when MapLibre cannot compile the expression
        const filter = excludeIdsFilter([1, 2])
        expect(filter).toBeDefined()
        expect(shown(filter, 1)).toBe(false)
        expect(shown(filter, 2)).toBe(false)
        expect(shown(filter, 3)).toBe(true)
        expect(shown(filter, undefined)).toBe(true)
        expect(shown(filter, "1")).toBe(true)
    })

    it("skips ids MapLibre cannot use as a match label", () => {
        expect(excludeIdsFilter([1.5, Number.MAX_SAFE_INTEGER + 2, 4])).toEqual(["match", ["id"], [4], false, true])
        expect(excludeIdsFilter([1.5])).toBeUndefined()
    })

    it("combines with a geometry filter", () => {
        const geometry: FilterSpecification = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]
        const hidden = excludeIdsFilter([5])
        expect(combineFilters(geometry, ...(hidden ? [hidden] : []))).toEqual([
            "all",
            geometry,
            ["match", ["id"], [5], false, true],
        ])
    })
})

describe("lineStringLayerIds", () => {
    it("lists the casing below the line", () => {
        expect(lineStringLayerIds("roads")).toEqual(["roads-outline", "roads"])
    })
})

describe("polygonLayerIds", () => {
    it("lists the fill below both outlines", () => {
        expect(polygonLayerIds("parks")).toEqual(["parks", "parks-outline-0", "parks-outline-1"])
    })
})

describe("layerOrderMoves", () => {
    // Same semantics as MapLibre's `moveLayer(id, beforeId)`
    function applyMoves(order: string[], moves: { id: string; beforeId: string }[]) {
        return moves.reduce((current, { id, beforeId }) => {
            const rest = current.filter(other => other !== id)
            const index = rest.indexOf(beforeId)
            return [...rest.slice(0, index), id, ...rest.slice(index)]
        }, order)
    }

    it("moves nothing when the layers are already in order", () => {
        expect(layerOrderMoves(["base", "a", "b", "c"], ["a", "b", "c"])).toEqual([])
    })

    it("restacks a block of layers that moved together", () => {
        const current = ["d", "c", "b", "a"]
        const wanted = ["b", "a", "d", "c"]

        expect(applyMoves(current, layerOrderMoves(current, wanted))).toEqual(wanted)
    })

    it("keeps the topmost wanted layer in place and leaves other layers alone", () => {
        const current = ["base", "b", "a", "label"]
        const moves = layerOrderMoves(current, ["a", "b"])

        expect(moves).toEqual([{ id: "a", beforeId: "b" }])
        expect(applyMoves(current, moves)).toEqual(["base", "a", "b", "label"])
    })

    it("skips layers the map does not have yet", () => {
        const current = ["b", "a"]
        const moves = layerOrderMoves(current, ["a", "missing", "b"])

        expect(applyMoves(current, moves)).toEqual(["a", "b"])
        expect(moves.flatMap(({ id, beforeId }) => [id, beforeId])).not.toContain("missing")
    })
})
