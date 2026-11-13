import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import * as Constants from "../src/constants"
import setupAfterNextRender from "./utils/after_next_render"
import createMap from "./utils/create_map"
import getGeoJSON from "./utils/get_geojson"
import makeMouseEvent from "./utils/make_mouse_event"
import makeTouchEvent from "./utils/make_touch_event"
import click from "./utils/mouse_click"
import tap from "./utils/touch_tap"
import waitForLoad from "./utils/wait_for_load"

// @turf/centroid is not installed in this workspace. This mirrors it for a
// single Polygon: the mean of all vertices, excluding the closing coordinate.
function turfCentroid(feature) {
    const [ring] = feature.geometry.coordinates
    const vertices = ring.slice(0, -1)
    const x = vertices.reduce((sum, c) => sum + c[0], 0) / vertices.length
    const y = vertices.reduce((sum, c) => sum + c[1], 0) / vertices.length
    return { geometry: { coordinates: [x, y] } }
}

describe("direct_select", () => {
    const mapContainer = document.createElement("div")
    let map
    let Draw
    let afterNextRender

    async function cleanUp() {
        Draw.deleteAll()
        map.fire.mockClear()
        await afterNextRender()
    }

    function getFireArgs() {
        return map.fire.mock.calls
    }

    beforeAll(async () => {
        document.body.appendChild(mapContainer)
        map = createMap({ container: mapContainer })

        Draw = new MapboxDraw()
        map.addControl(Draw)

        vi.spyOn(map, "fire")

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
            featureId: ids[0],
        })
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs[actionableArgs.length - 1][1]
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(false)
        }
        await cleanUp()
    })

    it("should fire correct actionable when a vertex is selected by clicking", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: ids[0],
        })
        const clickAt = getGeoJSON("polygon").geometry.coordinates[0][0]
        await afterNextRender()
        click(map, makeMouseEvent(clickAt[0], clickAt[1]))
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs[actionableArgs.length - 1][1]
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }
        await cleanUp()
    })

    it("should fire correct actionable when a vertex is selected by tapping", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: ids[0],
        })
        const tapAt = getGeoJSON("polygon").geometry.coordinates[0][0]
        await afterNextRender()
        tap(map, makeTouchEvent(tapAt[0], tapAt[1]))
        await afterNextRender()
        const actionableArgs = getFireArgs().filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = actionableArgs[actionableArgs.length - 1][1]
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }
        await cleanUp()
    })

    it("trashing vertices should delete the correct ones", async () => {
        const longLine = {
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
            featureId: ids[0],
        })
        await afterNextRender()
        // select multiple nodes at indices 9, 10, 11
        click(map, makeMouseEvent(70, 10, { shiftKey: true }))
        click(map, makeMouseEvent(80, 10, { shiftKey: true }))
        click(map, makeMouseEvent(60, 10, { shiftKey: true }))
        await afterNextRender()
        Draw.trash()
        const afterTrash = Draw.get(ids[0])
        expect(afterTrash.geometry.coordinates).toEqual([
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
            featureId: ids[0],
        })

        const clickAt = getGeoJSON("polygon").geometry.coordinates[0][0]
        await afterNextRender()
        click(map, makeMouseEvent(clickAt[0], clickAt[1]))
        await afterNextRender()
        map.fire("mousedown", makeMouseEvent(clickAt[0] + 15, clickAt[1] + 15))
        map.fire("mousemove", makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(clickAt[0] + 30, clickAt[1] + 30))
        const afterMove = Draw.get(ids[0])
        expect(getGeoJSON("polygon").geometry, "should be the same after the drag").toEqual(afterMove.geometry)
        await cleanUp()
    })

    it("fire one update when dragging mouse leaves container and button is released outside", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: ids[0],
        })

        const startPosition = getGeoJSON("polygon").geometry.coordinates[0][1]
        await afterNextRender()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        await afterNextRender()
        map.fire.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30), { buttons: 1 })
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30))

        const afterMove = Draw.get(ids[0])
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(afterMove.geometry.coordinates[0][1][0], "point lng moved only the first amount").toBe(
            startPosition[0] + 15,
        )
        expect(afterMove.geometry.coordinates[0][1][1], "point lat moved only the first amount").toBe(
            startPosition[1] + 15,
        )

        await cleanUp()
    })

    it("fire two updates when dragging mouse leaves container then returns and button is released inside", async () => {
        const ids = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: ids[0],
        })

        const startPosition = getGeoJSON("polygon").geometry.coordinates[0][1]
        await afterNextRender()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        await afterNextRender()
        map.fire.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 30, startPosition[1] + 30))

        const afterMove = Draw.get(ids[0])
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called twice").toBe(2)
        expect(afterMove.geometry.coordinates[0][1][0], "point lng moved to the mouseup location").toBe(
            startPosition[0] + 30,
        )
        expect(afterMove.geometry.coordinates[0][1][1], "point lat moved to the mouseup location").toBe(
            startPosition[1] + 30,
        )

        await cleanUp()
    })

    it("drag feature if no vertices are selected", async () => {
        const [polygonId] = Draw.add(getGeoJSON("polygon"))
        Draw.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: polygonId,
        })

        const startPosition = getGeoJSON("polygon").geometry.coordinates[0][1]
        const centroid = turfCentroid(getGeoJSON("polygon")).geometry.coordinates
        await afterNextRender()
        map.fire.mockClear()
        click(map, makeMouseEvent(centroid[0], centroid[1]))
        map.fire("mousedown", makeMouseEvent(centroid[0], centroid[1]))
        map.fire("mousemove", makeMouseEvent(centroid[0] + 15, centroid[1] + 15, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(centroid[0] + 15, centroid[1] + 15))

        const afterMove = Draw.get(polygonId)
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(afterMove.geometry.coordinates[0][1][0], "point lng moved to the mouseup location").toBe(
            startPosition[0] + 15,
        )
        expect(afterMove.geometry.coordinates[0][1][1], "point lat moved to the mouseup location").toBe(
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

        const startPosition = getGeoJSON("line").geometry.coordinates[0]
        const endPosition = [startPosition[0] + 10, startPosition[1] + 10]
        await afterNextRender()
        map.fire.mockClear()
        click(map, makeMouseEvent(startPosition[0], startPosition[1]))
        expect(Draw.getSelectedPoints().features[0].geometry.coordinates, "click saves selection").toEqual(
            startPosition,
        )

        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(endPosition[0], endPosition[1], { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(endPosition[0], endPosition[1]))
        await afterNextRender()
        expect(
            Draw.getSelectedPoints().features[0].geometry.coordinates,
            "selection is accurate after dragging",
        ).toEqual(endPosition)
        await cleanUp()
    })
})
