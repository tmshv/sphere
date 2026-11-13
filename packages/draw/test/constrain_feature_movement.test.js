import { describe, expect, it } from "vitest"
import getGeoJSON from "./utils/get_geojson"
import constrainFeatureMovement from "../src/lib/constrain_feature_movement"

describe("constrainFeatureMovement", () => {
    it("point, no constraint", () => {
        const point = getGeoJSON("point")
        point.geometry.coordinates = [10, 20]
        const constrainedDelta = constrainFeatureMovement([point], {
            lat: 13,
            lng: 0,
        })
        expect(constrainedDelta).toEqual({
            lat: 13,
            lng: 0,
        })
    })

    it("point, requiring northern constraint", () => {
        const point = getGeoJSON("point")
        point.geometry.coordinates = [10, 20]
        const constrainedDelta = constrainFeatureMovement([point], {
            lat: 80,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: 65,
            lng: 0,
        })
    })

    it("point, requiring southern constraint", () => {
        const point = getGeoJSON("point")
        point.geometry.coordinates = [10, -20]
        const constrainedDelta = constrainFeatureMovement([point], {
            lat: -80,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: -65,
            lng: 0,
        })
    })

    it("point, requiring western wrap", () => {
        const point = getGeoJSON("point")
        point.geometry.coordinates = [10, -20]
        const constrainedDelta = constrainFeatureMovement([point], {
            lat: 10,
            lng: -300,
        })
        expect(constrainedDelta, "stopped within bounds").toEqual({
            lat: 10,
            lng: 60,
        })
    })

    it("point, requiring eastern wrap", () => {
        const point = getGeoJSON("point")
        point.geometry.coordinates = [10, 20]
        const constrainedDelta = constrainFeatureMovement([point], {
            lat: 10,
            lng: 300,
        })
        expect(constrainedDelta, "stopped within bounds").toEqual({
            lat: 10,
            lng: -60,
        })
    })

    it("line, no constraint", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[0, 0], [10, 10], [20, 20]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: 13,
            lng: 0,
        })
        expect(constrainedDelta).toEqual({
            lat: 13,
            lng: 0,
        })
    })

    it("line, requiring northern inner constraint", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[80, 80], [81, 81]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: 7,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: 5,
            lng: 0,
        })
    })

    it("line, requiring northern outer constraint", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[30, 30], [81, 81]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: 12,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: 9,
            lng: 0,
        })
    })

    it("line, requiring southern inner constraint", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[-80, -80], [-81, -81]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: -7,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: -5,
            lng: 0,
        })
    })

    it("line, requiring southern outer constraint", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[-30, -30], [-81, -81]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: -12,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: -9,
            lng: 0,
        })
    })

    it("line, requiring western wrap", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[0, 0], [10, 10], [20, 20]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: 0,
            lng: -280,
        })
        expect(constrainedDelta).toEqual({
            lat: 0,
            lng: 80,
        })
    })

    it("line, requiring eastern wrap", () => {
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[0, 0], [10, 10], [20, 20]]
        const constrainedDelta = constrainFeatureMovement([line], {
            lat: 0,
            lng: 255,
        })
        expect(constrainedDelta).toEqual({
            lat: 0,
            lng: -105,
        })
    })

    it("polygon, no constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: 13,
            lng: 0,
        })
        expect(constrainedDelta).toEqual({
            lat: 13,
            lng: 0,
        })
    })

    it("polygon, requiring northern inner constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[80, 80], [81, 81], [81, 82], [80, 80]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: 7,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: 5,
            lng: 0,
        })
    })

    it("polygon, requiring northern outer constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[30, 30], [30, 40], [81, 81], [30, 30]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: 12,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: 9,
            lng: 0,
        })
    })

    it("polygon, requiring southern inner constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[-80, -80], [-81, -81], [-81, -82], [-80, -80]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: -7,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: -5,
            lng: 0,
        })
    })

    it("polygon, requiring southern outer constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[-30, -30], [-30, -40], [-81, -81], [-30, -30]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: -12,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: -9,
            lng: 0,
        })
    })

    it("polygon, requiring western wrap", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: 70,
            lng: -270,
        })
        expect(constrainedDelta).toEqual({
            lat: 70,
            lng: 90,
        })
    })

    it("polygon, requiring eastern wrap", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const constrainedDelta = constrainFeatureMovement([polygon], {
            lat: 35,
            lng: 270,
        })
        expect(constrainedDelta).toEqual({
            lat: 35,
            lng: -90,
        })
    })

    it("many features, no constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: 13,
            lng: 0,
        })
        expect(constrainedDelta).toEqual({
            lat: 13,
            lng: 0,
        })
    })

    it("many features, requiring northern inner constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[80, 80], [81, 81], [81, 82], [80, 80]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: 13,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: 5,
            lng: 0,
        })
    })

    it("many features, requiring northern outer constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: 100,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: 65,
            lng: 0,
        })
    })

    it("many features, requiring southern inner constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[-80, -80], [-81, -81], [-81, -82], [-80, -80]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: -10,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within projection").toEqual({
            lat: -5,
            lng: 0,
        })
    })

    it("many features, requiring southern outer constraint", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: -200,
            lng: 0,
        })
        expect(constrainedDelta, "stopped within poles").toEqual({
            lat: -90,
            lng: 0,
        })
    })

    it("many features, requiring western wrap", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: 27,
            lng: -310,
        })
        expect(constrainedDelta).toEqual({
            lat: 27,
            lng: 50,
        })
    })

    it("many features, requiring eastern wrap", () => {
        const polygon = getGeoJSON("polygon")
        polygon.geometry.coordinates = [[0, 0], [10, 10], [20, 20], [0, 0]]
        const point = getGeoJSON("point")
        point.geometry.coordinates = [15, 15]
        const line = getGeoJSON("line")
        line.geometry.coordinates = [[15, 15], [25, 25]]
        const constrainedDelta = constrainFeatureMovement([polygon, point, line], {
            lat: 27,
            lng: 260,
        })
        expect(constrainedDelta).toEqual({
            lat: 27,
            lng: -100,
        })
    })
})

