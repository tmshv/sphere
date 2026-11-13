import { describe, expect, it, vi } from "vitest"
import Feature from "../src/feature_types/feature"
import createFeature from "./utils/create_feature"
import createMockCtx from "./utils/create_mock_feature_context"
import getPublicMemberKeys from "./utils/get_public_member_keys"

describe("feature", () => {
    it("Feature contrusctor and API", () => {
        const featureGeoJson = createFeature("line")
        const ctx = createMockCtx()
        const feature = new Feature(ctx, featureGeoJson)

        // Instance members
        expect(feature.ctx, "feature.ctx").toBe(ctx)
        expect(feature.coordinates, "feature.coordinates").toBe(featureGeoJson.geometry.coordinates)
        expect(feature.properties, "feature.properties").toBe(featureGeoJson.properties)
        expect(feature.id, "feature.id").toBe(featureGeoJson.id)
        expect(feature.type, "feature.type").toBe(featureGeoJson.geometry.type)
        expect(getPublicMemberKeys(feature).length, "no unexpected instance members").toBe(5)

        // Prototype members
        expect(typeof Feature.prototype.changed, "feature.changed").toBe("function")
        expect(typeof Feature.prototype.incomingCoords, "feature.incomingCoords").toBe("function")
        expect(typeof Feature.prototype.setCoordinates, "feature.setCoordinates").toBe("function")
        expect(typeof Feature.prototype.getCoordinates, "feature.getCoordinates").toBe("function")
        expect(typeof Feature.prototype.toGeoJSON, "feature.toGeoJSON").toBe("function")
        expect(typeof Feature.prototype.internal, "feature.internal").toBe("function")
        expect(typeof Feature.prototype.setProperty, "feature.setProperty").toBe("function")
        expect(getPublicMemberKeys(Feature.prototype).length, "no unexpected prototype members").toBe(7)

        const simpleFeatureGeoJson = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [0, 0],
            },
        }
        const featureWithDefaultsOnly = new Feature(ctx, simpleFeatureGeoJson)
        expect(featureWithDefaultsOnly.properties, "feature.properties defaults to {}").toEqual({})
        expect(featureWithDefaultsOnly.id, "feature.id is provided").toBeTruthy()
    })

    it("Feature#changed", () => {
        const ctx = createMockCtx()
        const featureGeoJson = createFeature("point")
        const feature = new Feature(ctx, featureGeoJson)

        ctx.store.featureChanged.mockClear()
        feature.changed()
        expect(ctx.store.featureChanged, "called function on store").toHaveBeenCalledTimes(1)
        expect(ctx.store.featureChanged, "with correct args").toHaveBeenNthCalledWith(1, featureGeoJson.id)
    })

    it("Feature#incomingCoords", () => {
        const ctx = createMockCtx()
        const featureGeoJson = createFeature("point")
        featureGeoJson.geometry.coordinates = [9, 10]
        const feature = new Feature(ctx, featureGeoJson)
        const changedSpy = vi.spyOn(feature, "changed")

        feature.incomingCoords([1, 2])
        expect(feature.coordinates).toEqual([1, 2])
        expect(changedSpy).toHaveBeenCalledTimes(1)
    })

    it("Feature#setCoordinates, Feature#setCoordinates", () => {
        const ctx = createMockCtx()
        const featureGeoJson = createFeature("point")
        featureGeoJson.geometry.coordinates = [9, 10]
        const feature = new Feature(ctx, featureGeoJson)
        const changedSpy = vi.spyOn(feature, "changed")

        expect(feature.getCoordinates()).toEqual([9, 10])

        feature.setCoordinates([1, 2])
        expect(feature.coordinates).toEqual([1, 2])
        expect(feature.getCoordinates()).toEqual([1, 2])
        expect(changedSpy).toHaveBeenCalledTimes(1)
    })

    it("Feature#toGeoJSON", () => {
        const ctx = createMockCtx()
        const polygon = createFeature("polygon")
        const feature = new Feature(ctx, polygon)
        expect(feature.toGeoJSON()).toEqual({
            id: feature.id,
            type: "Feature",
            properties: feature.properties,
            geometry: {
                coordinates: feature.coordinates,
                type: feature.type,
            },
        })
    })

    it("Feature#internal - when userProperties is true", () => {
        const ctx = createMockCtx({ userProperties: true })
        const polygon = createFeature("polygon")
        const feature = new Feature(ctx, polygon)
        expect(feature.internal("foo")).toEqual({
            type: "Feature",
            properties: {
                user_a: "b",
                user_c: "d",
                id: feature.id,
                meta: "feature",
                "meta:type": feature.type,
                active: "false",
                mode: "foo",
            },
            geometry: {
                coordinates: feature.coordinates,
                type: feature.type,
            },
        })
    })

    it("Feature#internal - when userProperties is false", () => {
        const ctx = createMockCtx({ userProperties: false })
        const polygon = createFeature("polygon")
        const feature = new Feature(ctx, polygon)
        expect(feature.internal("foo")).toEqual({
            type: "Feature",
            properties: {
                id: feature.id,
                meta: "feature",
                "meta:type": feature.type,
                active: "false",
                mode: "foo",
            },
            geometry: {
                coordinates: feature.coordinates,
                type: feature.type,
            },
        })
    })

    it("Feature#setProperty", () => {
        const ctx = createMockCtx()
        const polygon = createFeature("polygon")
        const feature = new Feature(ctx, polygon)
        feature.setProperty("size", 200)
        expect(feature.properties.size).toBe(200)
    })
})
