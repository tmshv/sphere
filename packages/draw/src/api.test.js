import { beforeAll, describe, expect, it, vi } from "vitest"
import * as Constants from "./constants"
import MapboxDraw from "./index"
import createMap from "./test-utils/create_map"
import getGeoJSON from "./test-utils/get_geojson"
import setupAfterNextRender from "./test-utils/after_next_render"
import waitForLoad from "./test-utils/wait_for_load"
import getPublicMemberKeys from "./test-utils/get_public_member_keys"

describe("api", () => {
    let map
    let afterNextRender
    let Draw
    let addSpy
    let deleteSpy

    beforeAll(async () => {
        map = createMap()
        afterNextRender = setupAfterNextRender(map)
        Draw = new MapboxDraw()
        map.addControl(Draw)
        addSpy = vi.spyOn(Draw, "add")
        deleteSpy = vi.spyOn(Draw, "delete")
        await waitForLoad(map)
    })

    it("Draw.getFeatureIdsAt", async () => {
        const feature = getGeoJSON("point")
        const [id] = Draw.add(feature)
        await afterNextRender()
        // These tests require the the pixel space
        // and lat/lng space are equal (1px = 1deg)
        const featureIds = Draw.getFeatureIdsAt({
            x: feature.geometry.coordinates[0],
            y: feature.geometry.coordinates[1],
        })

        expect(featureIds.length, "should return the added feature").toBe(1)
        expect(featureIds[0], "selected feature should match desired feature").toBe(id)
        Draw.deleteAll()
    })

    it("Draw.getSelectedIds", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [pointId] = Draw.add(getGeoJSON("point"))
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", { featureIds: [lineId, pointId] })
        const selected = Draw.getSelectedIds()
        expect(selected.length, "returns correct number of ids").toBe(2)
        expect(selected.indexOf(lineId), "result contains line").not.toBe(-1)
        expect(selected.indexOf(pointId), "result contains point").not.toBe(-1)
        Draw.changeMode("simple_select", { featureIds: [polygonId] })
        const nextSelected = Draw.getSelectedIds()
        expect(nextSelected.length, "updates length").toBe(1)
        expect(nextSelected[0], "updates content").toBe(polygonId)
    })

    it("Draw.getSelected", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [pointId] = Draw.add(getGeoJSON("point"))
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", { featureIds: [lineId, pointId] })
        const fc = Draw.getSelected()

        expect(typeof fc.features, "we have a feature collection").toBe("object")

        const selected = fc.features.map(f => f.id)
        expect(selected.length, "returns correct number of ids").toBe(2)
        expect(selected.indexOf(lineId), "result contains line").not.toBe(-1)
        expect(selected.indexOf(pointId), "result contains point").not.toBe(-1)
        Draw.changeMode("simple_select", { featureIds: [polygonId] })
        const nextSelected = Draw.getSelected().features.map(f => f.id)
        expect(nextSelected.length, "updates length").toBe(1)
        expect(nextSelected[0], "updates content").toBe(polygonId)
    })

    it("Draw.set", () => {
        const point = getGeoJSON("point")
        const line = getGeoJSON("line")
        const polygon = getGeoJSON("polygon")

        // First set it to one collection
        const collection = {
            type: "FeatureCollection",
            features: [point, line, polygon],
        }
        const drawInstance = Draw.set(collection)
        expect(drawInstance.length, "return value is correct length").toBe(3)
        const pointId = drawInstance[0]
        const lineId = drawInstance[1]
        const polygonId = drawInstance[2]
        expect(Draw.get(pointId).geometry.type, "point id returned").toBe("Point")
        expect(Draw.get(lineId).geometry.type, "line id returned").toBe("LineString")
        expect(Draw.get(polygonId).geometry.type, "polygon id returned").toBe("Polygon")
        expect(Draw.getAll().features.length, "all features loaded").toBe(3)

        // Then set to another
        addSpy.mockClear()
        deleteSpy.mockClear()
        const nextCollection = {
            type: "FeatureCollection",
            features: [polygon],
        }
        const nextDrawInstance = Draw.set(nextCollection)
        expect(nextDrawInstance.length, "return value is correct length").toBe(1)
        const nextPolygonId = nextDrawInstance[0]
        expect(Draw.get(nextPolygonId).geometry.type, "polygon id returned").toBe("Polygon")
        expect(Draw.getAll().features.length, "all features replaced with new ones").toBe(1)
        expect(addSpy, "Draw.add called with new collection").toHaveBeenCalledWith(nextCollection)
        expect(deleteSpy, "Draw.delete called").toHaveBeenCalledTimes(1)
        expect(deleteSpy, "Draw.delete called with old features").toHaveBeenNthCalledWith(1, [
            pointId,
            lineId,
            polygonId,
        ])

        // Then set to another that contains a feature
        // with an already-used id
        addSpy.mockClear()
        deleteSpy.mockClear()
        const newLine = getGeoJSON("line")
        const overlappingPolygon = getGeoJSON("polygon")
        overlappingPolygon.id = nextPolygonId
        const overlappingCollection = {
            type: "FeatureCollection",
            features: [newLine, overlappingPolygon],
        }
        const overlappingDrawInstance = Draw.set(overlappingCollection)
        expect(overlappingDrawInstance.length, "return value is correct length").toBe(2)
        const newLineId = overlappingDrawInstance[0]
        const overlappingPolygonId = overlappingDrawInstance[1]
        expect(Draw.get(newLineId).geometry.type, "new line id returned").toBe("LineString")
        expect(Draw.get(overlappingPolygonId).geometry.type, "overlapping polygon id returned").toBe("Polygon")
        expect(overlappingPolygonId, "overlapping polygon id did not change").toBe(nextPolygonId)
        expect(addSpy, "Draw.add called with overlapping collection").toHaveBeenCalledWith(overlappingCollection)
        expect(deleteSpy, "Draw.delete not called").toHaveBeenCalledTimes(0)
    })

    it("Draw.set errors", () => {
        expect(() => {
            Draw.set(getGeoJSON("point"))
        }, "when you pass a feature").toThrow()
        expect(() => {
            Draw.set({
                type: "FeatureCollection",
            })
        }, "when you pass a collection without features").toThrow()
    })

    it("Draw.add -- point", () => {
        const id = Draw.add(getGeoJSON("point"))[0]
        expect(typeof id, "valid string id returned on add").toBe("string")
        Draw.deleteAll()
    })

    it("Draw.add -- FeatureCollection", () => {
        const listOfIds = Draw.add(getGeoJSON("featureCollection"))
        expect(listOfIds.length, "valid string id returned when adding a featureCollection").toBe(
            getGeoJSON("featureCollection").features.length,
        )
        Draw.deleteAll()
    })

    it("Draw.add -- MultiPolygon", () => {
        const multiId = Draw.add(getGeoJSON("multiPolygon"))[0]
        expect("string", "accepts multi features").toBe(typeof multiId)
        Draw.deleteAll()
    })

    it("Draw.add -- null geometry", () => {
        expect(() => {
            Draw.add(getGeoJSON("nullGeometry"))
        }, "null geometry is invalid").toThrow()
    })

    it("Draw.add -- GeometryCollection", () => {
        expect(() => {
            Draw.add(getGeoJSON("geometryCollection"))
        }, "geometry collections are not valid in Draw").toThrow()
    })

    it("Draw.add - accept lots of decimal percision", () => {
        for (let i = 0; i < 30; i++) {
            const div = 10 ** i
            const pos = [1 / div, 1 / div]
            const id = Draw.add({
                type: "Point",
                coordinates: pos,
            })
            const point = Draw.get(id)
            expect(point.geometry.coordinates[0], `lng right at 10e${i}`).toBe(pos[0])
            expect(point.geometry.coordinates[1], `lat right at 10e${i}`).toBe(pos[1])
        }
        Draw.deleteAll()
    })

    it("Draw.add -- change geometry type", () => {
        const id = Draw.add(getGeoJSON("point"))[0]
        const polygon = getGeoJSON("polygon")
        polygon.id = id
        Draw.add(polygon)
        expect(polygon, "changed geometry type").toEqual(Draw.get(id))
        Draw.deleteAll()
    })

    it("Draw.add -- existing feature with changed properties", async () => {
        const id = Draw.add(getGeoJSON("point"))
        let point = Draw.get(id)

        await afterNextRender()
        point.properties = { testing: 123 }
        Draw.add(point)
        point = Draw.get(id)
        expect("testing").toBe(Object.keys(point.properties)[0])
        expect(123).toBe(point.properties.testing)
        Draw.deleteAll()
    })

    it("Draw.get", () => {
        const id = Draw.add(getGeoJSON("point"))
        const f = Draw.get(id)
        expect(getGeoJSON("point").geometry.coordinates, "the geometry added is the same returned by Draw.get").toEqual(
            f.geometry.coordinates,
        )

        expect(Draw.get("foo"), "returned undefined when no feature found").toBe(undefined)

        Draw.deleteAll()
    })

    it("Draw.getAll", () => {
        Draw.add(getGeoJSON("point"))
        expect(getGeoJSON("point").geometry, "the geometry added is the same returned by Draw.getAll").toEqual(
            Draw.getAll().features[0].geometry,
        )
        Draw.deleteAll()
    })

    it("Draw.delete one feature", () => {
        const id = Draw.add(getGeoJSON("point"))[0]
        const drawInstance = Draw.delete(id)
        expect(drawInstance, "returns Draw instance").toBe(Draw)
        expect(Draw.getAll().features.length, "can remove a feature by its id").toBe(0)
    })

    it("Draw.delete multiple features", () => {
        const [pointId] = Draw.add(getGeoJSON("point"))
        const [lineId] = Draw.add(getGeoJSON("line"))
        Draw.add(getGeoJSON("polygon"))
        const drawInstance = Draw.delete([pointId, lineId])
        expect(drawInstance, "returns Draw instance").toBe(Draw)
        expect(Draw.getAll().features.length, "can remove multiple features by id").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "the right features were removed").toBe("Polygon")
        Draw.deleteAll()
    })

    it("Draw.delete a feature that is direct_selected", () => {
        const [id] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("direct_select", { featureId: id })
        Draw.delete([id])
        expect(Draw.getAll().features.length, "removed the feature").toBe(0)
        expect(Draw.getMode(), "changed modes to simple_select").toBe("simple_select")
    })

    it("Draw.deleteAll", () => {
        Draw.add(getGeoJSON("point"))
        const drawInstance = Draw.deleteAll()
        expect(drawInstance, "returns Draw instance").toBe(Draw)
        expect(Draw.getAll().features.length, "Draw.deleteAll removes all geometries").toBe(0)
    })

    it("Draw.deleteAll when in direct_select mode", async () => {
        Draw.add(getGeoJSON("point"))
        const id = Draw.add(getGeoJSON("line"))
        Draw.changeMode("direct_select", { featureId: id })
        Draw.deleteAll()
        await afterNextRender()
        expect(Draw.getMode(), "switches to simple_select mode").toBe("simple_select")
        expect(Draw.getAll().features.length, "removes selected feature along with others").toBe(0)
    })

    it("Draw.changeMode and Draw.getMode with no pre-existing feature", () => {
        const drawInstance = Draw.changeMode("draw_polygon")
        expect(drawInstance, "changeMode returns Draw instance").toBe(Draw)
        expect(Draw.getMode(), "changed to draw_polygon").toBe("draw_polygon")
        expect(Draw.getAll().features.length, "one feature added").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "and it is a polygon").toBe("Polygon")
        expect(Draw.getAll().features[0].geometry.coordinates, "and it is empty").toEqual([[null]])

        Draw.changeMode("draw_line_string")
        expect(Draw.getMode(), "changed to draw_line_string").toBe("draw_line_string")
        expect(Draw.getAll().features.length, "still only one feature added").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "and it is a line").toBe("LineString")
        expect(Draw.getAll().features[0].geometry.coordinates, "and it is empty").toEqual([])

        Draw.changeMode("draw_point")
        expect(Draw.getMode(), "changed to draw_point").toBe("draw_point")
        expect(Draw.getAll().features.length, "still only one feature added").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "and it is a point").toBe("Point")
        expect(Draw.getAll().features[0].geometry.coordinates, "and it is empty").toEqual([])

        Draw.changeMode("simple_select")
        expect(Draw.getMode(), "changed to simple_select").toBe("simple_select")
        expect(Draw.getAll().features.length, "no features added").toBe(0)

        expect(() => {
            Draw.changeMode("direct_select")
        }, "cannot enter direct_select mode with a featureId").toThrow()
    })

    it("Draw.changeMode to select and de-select pre-existing features", async () => {
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [pointId] = Draw.add(getGeoJSON("point"))

        const returnA = Draw.changeMode("simple_select", { featureIds: [polygonId, lineId] })
        expect(returnA, "returns Draw instance").toBe(Draw)
        expect(Draw.getMode(), "changed to simple_select").toBe("simple_select")
        expect(Draw.getSelectedIds(), "polygon and line are selected").toEqual([polygonId, lineId])

        const returnB = Draw.changeMode("simple_select", { featureIds: [polygonId, lineId] })
        expect(returnB, "returns Draw instance").toBe(Draw)
        expect(Draw.getSelectedIds(), "polygon and line are still selected").toEqual([polygonId, lineId])

        const returnC = Draw.changeMode("simple_select", { featureIds: [pointId] })
        expect(returnC, "returns Draw instance").toBe(Draw)
        await afterNextRender()
        expect(true, "a render occurred when selection changed").toBe(true)

        expect(Draw.getSelectedIds(), "change to simple_select with different featureIds to change selection").toEqual([
            pointId,
        ])

        const returnD = Draw.changeMode("direct_select", { featureId: polygonId })
        expect(returnD, "returns Draw instance").toBe(Draw)
        expect(Draw.getSelectedIds(), "change to direct_select changes selection").toEqual([polygonId])

        const returnE = Draw.changeMode("direct_select", { featureId: polygonId })
        expect(returnE, "returns Draw instance").toBe(Draw)
        expect(Draw.getSelectedIds(), "changing to direct_select with same selection does nothing").toEqual([polygonId])

        Draw.deleteAll()
    })

    it("Draw.modes", () => {
        expect(Draw.modes.SIMPLE_SELECT, "simple_select").toBe(Constants.modes.SIMPLE_SELECT)
        expect(Draw.modes.DIRECT_SELECT, "direct_select").toBe(Constants.modes.DIRECT_SELECT)
        expect(Draw.modes.DRAW_POINT, "draw_point").toBe(Constants.modes.DRAW_POINT)
        expect(Draw.modes.DRAW_LINE_STRING, "draw_line_string").toBe(Constants.modes.DRAW_LINE_STRING)
        expect(Draw.modes.DRAW_POLYGON, "draw_polygon").toBe(Constants.modes.DRAW_POLYGON)
        expect(Draw.modes.STATIC, "static").toBe(Constants.modes.STATIC)
        expect(getPublicMemberKeys(Draw.modes).length, "no unexpected modes").toBe(6)
    })

    it("Draw.combineFeatures -- polygon + polygon = multiploygon", () => {
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        const [polygon2Id] = Draw.add(getGeoJSON("polygon2"))
        Draw.changeMode("simple_select", { featureIds: [polygonId, polygon2Id] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "can combine two features").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "can combine two polygons into MultiPolygon").toBe(
            "MultiPolygon",
        )
        expect(
            Draw.getAll().features[0].geometry.coordinates[0],
            "first set of coordinates in multipolygon matches with second polygon in selection",
        ).toEqual(getGeoJSON("polygon").geometry.coordinates)
        expect(
            Draw.getAll().features[0].geometry.coordinates[1],
            "second set of coordinates in multipolygon matches with first polygon in selection",
        ).toEqual(getGeoJSON("polygon2").geometry.coordinates)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- point + point = multipoint", () => {
        const [pointId] = Draw.add(getGeoJSON("point"))
        const [point2Id] = Draw.add(getGeoJSON("point2"))
        Draw.changeMode("simple_select", { featureIds: [pointId, point2Id] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "can combine two features").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "can combine two points into MultiPoint").toBe("MultiPoint")
        expect(
            Draw.getAll().features[0].geometry.coordinates[0],
            "first set of coordinates in multipoint matches with first point in selection",
        ).toEqual(getGeoJSON("point").geometry.coordinates)
        expect(
            Draw.getAll().features[0].geometry.coordinates[1],
            "second set of coordinates in multipoint matches with second point in selection",
        ).toEqual(getGeoJSON("point2").geometry.coordinates)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- linestring + linestring = multilinestring", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [line2Id] = Draw.add(getGeoJSON("line2"))
        Draw.changeMode("simple_select", { featureIds: [lineId, line2Id] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "can combine two features").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "can combine two linestrings into MultiLineString").toBe(
            "MultiLineString",
        )
        expect(
            Draw.getAll().features[0].geometry.coordinates[0],
            "first set of coordinates in multilinestring matches with first line in selection",
        ).toEqual(getGeoJSON("line").geometry.coordinates)
        expect(
            Draw.getAll().features[0].geometry.coordinates[1],
            "second set of coordinates in multilinestring matches with second line selection",
        ).toEqual(getGeoJSON("line2").geometry.coordinates)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- point + multipoint = multipoint", () => {
        const [pointId] = Draw.add(getGeoJSON("point"))
        const [multipointId] = Draw.add(getGeoJSON("multiPoint"))
        Draw.changeMode("simple_select", { featureIds: [pointId, multipointId] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "can combine two features").toBe(1)
        expect(Draw.getAll().features[0].geometry.type, "can combine two points into MultiPoint").toBe("MultiPoint")
        expect(
            Draw.getAll().features[0].geometry.coordinates[0],
            "first set of coordinates in multipoint matches with first point in selection",
        ).toEqual(getGeoJSON("point").geometry.coordinates)
        expect(
            Draw.getAll().features[0].geometry.coordinates[1],
            "second set of coordinates in multipoint matches with first set of coordinates in multipoint in selection",
        ).toEqual(getGeoJSON("multiPoint").geometry.coordinates[0])
        expect(
            Draw.getAll().features[0].geometry.coordinates[2],
            "third set of coordinates in multipoint matches with second set of coordinates in multipoint in selection",
        ).toEqual(getGeoJSON("multiPoint").geometry.coordinates[1])
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- return on non-similar features", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", { featureIds: [lineId, polygonId] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "should not combine non similar features").toBe(2)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- do nothing on non-similar features", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", { featureIds: [lineId, polygonId] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "should not combine non similar features").toBe(2)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- work for multifeature + feature", () => {
        const [multipolygonId] = Draw.add(getGeoJSON("multiPolygon"))
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", { featureIds: [polygonId, multipolygonId] })

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "should work for multifeature + feature").toBe(1)
        Draw.deleteAll()
    })

    it("Draw.combineFeatures -- should do nothing if nothing is selected", () => {
        Draw.add(getGeoJSON("multiPolygon"))
        Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", {})

        Draw.combineFeatures()
        expect(Draw.getAll().features.length, "should do nothing if nothing is selected").toBe(2)
        Draw.deleteAll()
    })

    it("Draw.uncombineFeatures -- multilinestring", () => {
        const [multiLineStringId] = Draw.add(getGeoJSON("multiLineString"))
        Draw.changeMode("simple_select", { featureIds: [multiLineStringId] })

        Draw.uncombineFeatures()
        const featuresInDraw = Draw.getAll().features

        expect(featuresInDraw.length, "can uncombine multiLineString").toBe(2)

        expect(
            featuresInDraw[0].geometry.coordinates,
            "first set of coordinates in multilinestring matches with first lineString in selection",
        ).toEqual(getGeoJSON("multiLineString").geometry.coordinates[0])

        expect(
            featuresInDraw[1].geometry.coordinates,
            "second set of coordinates in multilinestring matches with second lineString in selection",
        ).toEqual(getGeoJSON("multiLineString").geometry.coordinates[1])

        Draw.deleteAll()
    })

    it("Draw.uncombineFeatures -- multipolygon", () => {
        const [multipolygon2Id] = Draw.add(getGeoJSON("multiPolygon2"))
        Draw.changeMode("simple_select", { featureIds: [multipolygon2Id] })

        Draw.uncombineFeatures()

        const featuresInDraw = Draw.getAll().features

        expect(featuresInDraw.length, "can uncombine multipolygon").toBe(2)

        expect(
            featuresInDraw[0].geometry.coordinates,
            "first set of coordinates in multipolygon matches with first polygon in selection",
        ).toEqual(getGeoJSON("multiPolygon2").geometry.coordinates[0])

        expect(
            featuresInDraw[1].geometry.coordinates,
            "second set of coordinates in multipolygon matches with second polygon in selection",
        ).toEqual(getGeoJSON("multiPolygon2").geometry.coordinates[1])

        Draw.deleteAll()
    })

    it("Draw.uncombineFeatures -- multipoint", () => {
        const [multipointId] = Draw.add(getGeoJSON("multiPoint"))
        Draw.changeMode("simple_select", { featureIds: [multipointId] })

        Draw.uncombineFeatures()

        const featuresInDraw = Draw.getAll().features

        expect(featuresInDraw.length, "can uncombine multipoint").toBe(2)

        expect(
            featuresInDraw[0].geometry.coordinates,
            "first set of coordinates in multipoint matches with first point in selection",
        ).toEqual(getGeoJSON("multiPoint").geometry.coordinates[0])

        expect(
            featuresInDraw[1].geometry.coordinates,
            "second set of coordinates in multipoint matches with second point in selection",
        ).toEqual(getGeoJSON("multiPoint").geometry.coordinates[1])

        Draw.deleteAll()
    })

    it("Draw.uncombineFeatures -- should do nothing if nothing is selected", () => {
        Draw.add(getGeoJSON("multiPolygon"))
        Draw.add(getGeoJSON("polygon"))
        Draw.changeMode("simple_select", {})

        Draw.uncombineFeatures()
        expect(Draw.getAll().features.length, "should do nothing if nothing is selected").toBe(2)
        Draw.deleteAll()
    })

    it("Draw.uncombineFeatures -- should do nothing if nothing if only non multifeature is selected", () => {
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        const [pointId] = Draw.add(getGeoJSON("point"))
        Draw.changeMode("simple_select", { featureIds: [polygonId, pointId] })

        Draw.uncombineFeatures()
        expect(Draw.getAll().features.length, "should do nothing if nothing is selected").toBe(2)
        Draw.deleteAll()
    })

    it("Draw.setFeatureProperty", () => {
        Draw.add(getGeoJSON("point"))
        const featureId = Draw.getAll().features[0].id
        const drawInstance = Draw.setFeatureProperty(featureId, "price", 200)
        expect(drawInstance, "returns Draw instance").toBe(Draw)
        expect(Draw.get(featureId).properties.price, "Draw.setFeatureProperty adds a property").toBe(200)
    })

    it("Cleanup", () => {
        Draw.deleteAll()
        Draw.onRemove()
    })
})
