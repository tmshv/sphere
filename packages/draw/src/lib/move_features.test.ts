import { describe, expect, it } from "vitest"
import LineString from "../feature_types/line_string"
import Point from "../feature_types/point"
import Polygon from "../feature_types/polygon"
import moveFeatures from "./move_features"
import createMockFeatureContext from "../test-utils/create_mock_feature_context"
import getGeoJSON from "../test-utils/get_geojson"

const mockFeatureContext = createMockFeatureContext()

describe("move_features", () => {
    it("moveFeatures point", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 20])
        moveFeatures([point], { lng: 7, lat: 13 })
        expect(point.getCoordinates()).toEqual([17, 33])
    })

    it("moveFeatures point beyond north limit map", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 20])
        moveFeatures([point], { lng: 50, lat: 120 })
        expect(point.getCoordinates()).toEqual([60, 85])
    })

    it("moveFeatures point beyond south limit", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 20])
        moveFeatures([point], { lng: -20, lat: -200 })
        expect(point.getCoordinates()).toEqual([-10, -85])
    })

    it("moveFeatures line", () => {
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        moveFeatures([line], { lng: 7, lat: 13 })
        expect(line.getCoordinates()).toEqual([
            [17, 28],
            [-3, -17],
            [24, 46],
        ])
    })

    it("moveFeatures line beyond north limit", () => {
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        moveFeatures([line], { lng: 7, lat: 60 })
        expect(line.getCoordinates(), "lat should only move 57").toEqual([
            [17, 72],
            [-3, 27],
            [24, 90],
        ])
    })

    it("moveFeatures line beyond south pole", () => {
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        moveFeatures([line], { lng: -7, lat: -100 })
        expect(line.getCoordinates(), "lat should only move -45").toEqual([
            [3, -45],
            [-17, -90],
            [10, -27],
        ])
    })

    it("moveFeatures polygon", () => {
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
            ],
        ])
        moveFeatures([polygon], { lng: -23, lat: 31.33 })
        expect(polygon.getCoordinates()).toEqual([
            [
                [-23, 31.33],
                [-23, 41.33],
                [-13, 41.33],
                [-13, 31.33],
                [-23, 31.33],
            ],
        ])
    })

    it("moveFeatures polygon beyond north limit", () => {
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, 20],
                [10, 10],
                [10, 0],
            ],
        ])
        moveFeatures([polygon], { lng: -0.5, lat: 100 })
        expect(polygon.getCoordinates(), "lat should only move 70").toEqual([
            [
                [-0.5, 70],
                [-0.5, 90],
                [9.5, 80],
                [9.5, 70],
                [-0.5, 70],
            ],
        ])
    })

    it("moveFeatures polygon beyond south pole", () => {
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, -10.5],
                [10, -40],
                [10, 0],
            ],
        ])
        moveFeatures([polygon], { lng: 1, lat: -80.44 })
        expect(polygon.getCoordinates(), "lat should only move -50").toEqual([
            [
                [1, -50],
                [1, -60.5],
                [11, -90],
                [11, -50],
                [1, -50],
            ],
        ])
    })

    it("moveFeatures multiple features", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 20])
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
            ],
        ])
        moveFeatures([point, line, polygon], { lng: 5, lat: -7 })
        expect(point.getCoordinates(), "point moved").toEqual([15, 13])
        expect(line.getCoordinates(), "line moved").toEqual([
            [15, 8],
            [-5, -37],
            [22, 26],
        ])
        expect(polygon.getCoordinates(), "polygon moved").toEqual([
            [
                [5, -7],
                [5, 3],
                [15, 3],
                [15, -7],
                [5, -7],
            ],
        ])
    })

    it("moveFeatures multiple features beyond north limit", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 45])
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
            ],
        ])
        moveFeatures([point, line, polygon], { lng: 5, lat: 200 })
        expect(point.getCoordinates(), "point lat only moved 40").toEqual([15, 85])
        expect(line.getCoordinates(), "line lat only moved 40").toEqual([
            [15, 55],
            [-5, 10],
            [22, 73],
        ])
        expect(polygon.getCoordinates(), "polygon lat only moved 40").toEqual([
            [
                [5, 40],
                [5, 50],
                [15, 50],
                [15, 40],
                [5, 40],
            ],
        ])
    })

    it("moveFeatures multiple features beyond south limit", () => {
        const point = new Point(mockFeatureContext, getGeoJSON("point"))
        point.setCoordinates([10, 20])
        const line = new LineString(mockFeatureContext, getGeoJSON("line"))
        line.setCoordinates([
            [10, 15],
            [-10, -30],
            [17, 33],
        ])
        const polygon = new Polygon(mockFeatureContext, getGeoJSON("polygon"))
        polygon.setCoordinates([
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
            ],
        ])
        moveFeatures([point, line, polygon], { lng: 5, lat: -120 })
        expect(point.getCoordinates(), "point lat only moved -60").toEqual([15, -40])
        expect(line.getCoordinates(), "line lat only moved -60").toEqual([
            [15, -45],
            [-5, -90],
            [22, -27],
        ])
        expect(polygon.getCoordinates(), "polygon moved").toEqual([
            [
                [5, -60],
                [5, -50],
                [15, -50],
                [15, -60],
                [5, -60],
            ],
        ])
    })
})
