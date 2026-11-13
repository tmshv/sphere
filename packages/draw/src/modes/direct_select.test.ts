import type { Feature, LineString, Polygon, Position } from "geojson"
import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from "vitest"
import MapLibreDraw from "../index"
import type { DrawActionableState, DrawExportedFeature } from "../types"
import * as Constants from "../constants"
import setupAfterNextRender, { type AfterNextRender } from "../test-utils/after_next_render"
import createMap, { type MockMap } from "../test-utils/create_map"
import getGeoJSON from "../test-utils/get_geojson"
import makeMouseEvent from "../test-utils/make_mouse_event"
import makeTouchEvent from "../test-utils/make_touch_event"
import click from "../test-utils/mouse_click"
import tap from "../test-utils/touch_tap"
import required from "../test-utils/required"
import waitForLoad from "../test-utils/wait_for_load"

// @turf/centroid is not installed in this workspace. This mirrors it for a
// single Polygon: the mean of all vertices, excluding the closing coordinate.
function turfCentroid(feature: Feature<Polygon>): { geometry: { coordinates: Position } } {
    const [ring] = feature.geometry.coordinates
    const vertices = required(ring).slice(0, -1)
    const x = vertices.reduce((sum, c) => sum + c[0], 0) / vertices.length
    const y = vertices.reduce((sum, c) => sum + c[1], 0) / vertices.length
    return { geometry: { coordinates: [x, y] } }
}

/** The coordinates of the exported feature, which must be a LineString. */
function lineCoordinates(feature: DrawExportedFeature | undefined): Position[] {
    const { geometry } = required(feature)
    if (geometry.type !== "LineString") throw new Error(`Expected a LineString, got ${geometry.type}`)
    return geometry.coordinates
}

/** The first ring of the exported feature, which must be a Polygon. */
function polygonRing(feature: DrawExportedFeature | undefined): Position[] {
    const { geometry } = required(feature)
    if (geometry.type !== "Polygon") throw new Error(`Expected a Polygon, got ${geometry.type}`)
    return required(geometry.coordinates[0])
}

/** A vertex of the polygon fixture's outer ring. */
function polygonVertex(index: number): Position {
    return required(required(getGeoJSON("polygon").geometry.coordinates[0])[index])
}

/** The actions of a `draw.actionable` event payload fired on the map. */
function isActionablePayload(data: unknown): data is { actions: DrawActionableState } {
    return typeof data === "object" && data !== null && "actions" in data
}

describe("direct_select", () => {
    const mapContainer = document.createElement("div")
    let map: MockMap
    let Draw: MapLibreDraw
    let afterNextRender: AfterNextRender
    let fireSpy: MockInstance<MockMap["fire"]>

    async function cleanUp() {
        Draw.deleteAll()
        fireSpy.mockClear()
        await afterNextRender()
    }

    function selectedPointCoordinates(): Position {
        const { geometry } = required(Draw.getSelectedPoints().features[0])
        if (geometry.type !== "Point") throw new Error(`Expected a Point, got ${geometry.type}`)
        return geometry.coordinates
    }

    function getFireArgs() {
        return fireSpy.mock.calls
    }

    beforeAll(async () => {
        document.body.appendChild(mapContainer)
        map = createMap({ container: mapContainer })

        Draw = new MapLibreDraw()
        map.addControl(Draw)

        fireSpy = vi.spyOn(map, "fire")

        afterNextRender = setupAfterNextRender(map)

        await waitForLoad(map)
    })

    afterAll(() => {
        mapContainer.remove()
    })

    it("should fire correct actionable when no vertices selected", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.SIMPLE_SELECT, {
            featureIds: ids,
        })
        await afterNextRender()
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs.at(-1)?.[1]
            if (!isActionablePayload(actionable)) throw new Error("draw.actionable fired without actions")
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(false)
        }
        await cleanUp()
    })

    it("should fire correct actionable when a vertex is selected by clicking", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })
        const clickAt = polygonVertex(0)
        await afterNextRender()
        click(map, makeMouseEvent(clickAt[0], clickAt[1]))
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs.at(-1)?.[1]
            if (!isActionablePayload(actionable)) throw new Error("draw.actionable fired without actions")
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }
        await cleanUp()
    })

    it("should fire correct actionable when a vertex is selected by tapping", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })
        const tapAt = polygonVertex(0)
        await afterNextRender()
        tap(map, makeTouchEvent(tapAt[0], tapAt[1]))
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs.at(-1)?.[1]
            if (!isActionablePayload(actionable)) throw new Error("draw.actionable fired without actions")
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }
        await cleanUp()
    })

    it("trashing vertices should delete the correct ones", async () => {
        const longLine: Feature<LineString> = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [10, 0],
                    [20, 0],
                    [30, 0],
                    [40, 0],
                    [50, 0],
                    [60, 0],
                    [70, 0],
                    [80, 0],
                    [80, 10],
                    [70, 10],
                    [60, 10],
                    [50, 10],
                ],
            },
        }
        const ids = Draw.add(longLine)
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })
        await afterNextRender()
        // select multiple nodes at indices 9, 10, 11
        click(map, makeMouseEvent(70, 10, { shiftKey: true }))
        click(map, makeMouseEvent(80, 10, { shiftKey: true }))
        click(map, makeMouseEvent(60, 10, { shiftKey: true }))
        await afterNextRender()
        Draw.trash()
        const afterTrash = Draw.get(required(ids[0]))
        expect(lineCoordinates(afterTrash)).toEqual([
            [0, 0],
            [10, 0],
            [20, 0],
            [30, 0],
            [40, 0],
            [50, 0],
            [60, 0],
            [70, 0],
            [80, 0],
            [50, 10],
        ])
        await cleanUp()
    })

    it("a click on a vertex and than dragging the map shouldn't drag the vertex", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })

        const clickAt = polygonVertex(0)
        await afterNextRender()
        click(map, makeMouseEvent(clickAt[0], clickAt[1]))
        await afterNextRender()
        map.fire("mousedown", makeMouseEvent(clickAt[0] + 15, clickAt[1] + 15))
        map.fire("mousemove", makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30))
        const afterMove = required(Draw.get(required(ids[0])))
        expect(getGeoJSON("polygon").geometry, "should be the same after the drag").toEqual(afterMove.geometry)
        await cleanUp()
    })

    it("fire one update when dragging mouse leaves container and button is released outside", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })

        const startPosition = polygonVertex(1)
        await afterNextRender()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30))

        const afterMove = Draw.get(required(ids[0]))
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(required(polygonRing(afterMove)[1])[0], "point lng moved only the first amount").toBe(
            startPosition[0] + 15,
        )
        expect(required(polygonRing(afterMove)[1])[1], "point lat moved only the first amount").toBe(
            startPosition[1] + 15,
        )

        await cleanUp()
    })

    it("fire two updates when dragging mouse leaves container then returns and button is released inside", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: required(ids[0]),
        })

        const startPosition = polygonVertex(1)
        await afterNextRender()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30))

        const afterMove = Draw.get(required(ids[0]))
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called twice").toBe(2)
        expect(required(polygonRing(afterMove)[1])[0], "point lng moved to the mouseup location").toBe(
            startPosition[0] + 30,
        )
        expect(required(polygonRing(afterMove)[1])[1], "point lat moved to the mouseup location").toBe(
            startPosition[1] + 30,
        )

        await cleanUp()
    })

    it("drag feature if no vertices are selected", async () => {
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: polygonId,
        })

        const startPosition = polygonVertex(1)
        const centroid = turfCentroid(getGeoJSON("polygon")).geometry.coordinates
        await afterNextRender()
        fireSpy.mockClear()
        click(map, makeMouseEvent(centroid[0], centroid[1]))
        map.fire("mousedown", makeMouseEvent(centroid[0], centroid[1]))
        map.fire("mousemove", makeMouseEvent(centroid[0] + 15, centroid[1] + 15, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(centroid[0] + 15, centroid[1] + 15))

        const afterMove = Draw.get(polygonId)
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(required(polygonRing(afterMove)[1])[0], "point lng moved to the mouseup location").toBe(
            startPosition[0] + 15,
        )
        expect(required(polygonRing(afterMove)[1])[1], "point lat moved to the mouseup location").toBe(
            startPosition[1] + 15,
        )

        await cleanUp()
    })

    it("dragging a selected vertex updates stored coordinates", async () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: lineId,
        })
        expect(Draw.getSelectedPoints().features[0], "no initial selection").toBeFalsy()

        const startPosition = required(getGeoJSON("line").geometry.coordinates[0])
        const endPosition = [startPosition[0] + 10, startPosition[1] + 10]
        await afterNextRender()
        fireSpy.mockClear()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        expect(selectedPointCoordinates(), "click saves selection").toEqual(startPosition)

        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(endPosition[0], endPosition[1], { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(endPosition[0], endPosition[1]))
        await afterNextRender()
        expect(selectedPointCoordinates(), "selection is accurate after dragging").toEqual(endPosition)
        await cleanUp()
    })

    it("trashing a selected MultiPoint vertex removes that point", async () => {
        const [id] = Draw.add(getGeoJSON("multiPoint"))
        const featureId = required(id)

        Draw.changeMode(Constants.modes.DIRECT_SELECT, { featureId, coordPath: "0" })
        expect(() => Draw.trash(), "trash does not throw").not.toThrow()
        const feature = required(Draw.get(featureId))
        if (feature.geometry.type !== "MultiPoint")
            throw new Error(`Expected a MultiPoint, got ${feature.geometry.type}`)
        expect(feature.geometry.coordinates, "first point removed").toEqual([[-10, -10]])

        // Re-entering direct_select for the same feature is a no-op, so leave it first
        Draw.changeMode(Constants.modes.SIMPLE_SELECT)
        Draw.changeMode(Constants.modes.DIRECT_SELECT, { featureId, coordPath: "0" })
        Draw.trash()
        expect(Draw.get(featureId), "trashing the last point deletes the feature").toBe(undefined)
        expect(Draw.getMode(), "back to simple_select").toBe(Constants.modes.SIMPLE_SELECT)
        await cleanUp()
    })
})
