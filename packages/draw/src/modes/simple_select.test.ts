import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from "vitest"
import MapLibreDraw from "../index"
import { TAP_INTERVAL, TAP_TOLERANCE } from "../lib/is_tap"
import setupAfterNextRender, { type AfterNextRender } from "../test-utils/after_next_render"
import createMap, { type MockInteraction, type MockMap } from "../test-utils/create_map"
import createMockDrawModeContext, { type MockDrawModeContext } from "../test-utils/create_mock_draw_mode_context"
import getGeoJSON from "../test-utils/get_geojson"
import makeMouseEvent from "../test-utils/make_mouse_event"
import makeTouchEvent from "../test-utils/make_touch_event"
import mouseClick from "../test-utils/mouse_click"
import required from "../test-utils/required"
import waitForLoad from "../test-utils/wait_for_load"
import type { DrawEventPayloads } from "../map-events"
import type { DrawExportedFeature } from "../types"
import type { Geometry } from "geojson"

type FireCall = [type: string, data?: unknown]

function isRecord(data: unknown): data is Record<string, unknown> {
    return typeof data === "object" && data !== null
}

function hasFeatures(data: unknown): data is DrawEventPayloads["draw.selectionchange"] {
    return isRecord(data) && Array.isArray(data.features)
}

function hasMode(data: unknown): data is DrawEventPayloads["draw.modechange"] {
    return isRecord(data) && typeof data.mode === "string"
}

function hasActions(data: unknown): data is DrawEventPayloads["draw.actionable"] {
    return isRecord(data) && isRecord(data.actions)
}

/** The data of a fired event, narrowed by `guard`; fails the test when the call or its data is missing. */
function payload<T>(call: FireCall | undefined, guard: (data: unknown) => data is T): T {
    const data = required(call)[1]
    if (!guard(data)) throw new Error("Fired event data has an unexpected shape")
    return data
}

function isGeometryOfType<K extends Geometry["type"]>(
    geometry: Geometry,
    type: K,
): geometry is Extract<Geometry, { type: K }> {
    return geometry.type === type
}

/** The geometry of a drawn feature; fails the test when there is no such feature or it has another geometry type. */
function geometryOf<K extends Geometry["type"]>(
    feature: DrawExportedFeature | undefined,
    type: K,
): Extract<Geometry, { type: K }> {
    const geometry = required(feature).geometry
    if (!isGeometryOfType(geometry, type)) throw new Error(`Expected a ${type}, got a ${geometry.type}`)
    return geometry
}

describe("simple_select", () => {
    let context: MockDrawModeContext
    let mapContainer: HTMLDivElement
    let map: MockMap
    let Draw: MapLibreDraw
    let afterNextRender: AfterNextRender
    let fireSpy: MockInstance<MockMap["fire"]>
    let doubleClickZoomEnable: MockInstance<MockInteraction["enable"]>
    let doubleClickZoomDisable: MockInstance<MockInteraction["disable"]>
    let dragPanEnable: MockInstance<MockInteraction["enable"]>
    let dragPanDisable: MockInstance<MockInteraction["disable"]>

    function cleanUp() {
        Draw.deleteAll()
        fireSpy.mockClear()
    }

    function getFireArgs(): FireCall[] {
        return [...fireSpy.mock.calls]
    }

    beforeAll(async () => {
        context = createMockDrawModeContext()
        mapContainer = document.createElement("div")
        document.body.appendChild(mapContainer)
        map = createMap({ container: mapContainer })

        Draw = new MapLibreDraw()
        map.addControl(Draw)

        fireSpy = vi.spyOn(map, "fire")
        doubleClickZoomEnable = vi.spyOn(map.doubleClickZoom, "enable")
        doubleClickZoomDisable = vi.spyOn(map.doubleClickZoom, "disable")
        dragPanEnable = vi.spyOn(map.dragPan, "enable")
        dragPanDisable = vi.spyOn(map.dragPan, "disable")

        afterNextRender = setupAfterNextRender(map)

        await waitForLoad(map)
    })

    afterAll(() => {
        mapContainer.remove()
    })

    it("box select", async () => {
        Draw.add(getGeoJSON("negativePoint"))
        const id = Draw.add(getGeoJSON("point"))[0]
        fireSpy.mockClear()

        await afterNextRender()
        dragPanEnable.mockClear()
        dragPanDisable.mockClear()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        expect(dragPanDisable, "disable dragPan").toHaveBeenCalledTimes(1)
        map.fire(
            "mousemove",
            makeMouseEvent(15, 15, {
                shiftKey: true,
                buttons: 1,
            }),
        )
        await afterNextRender()
        expect(map.getContainer().className.indexOf("mouse-add") > -1, "mouse-add class has been set").toBe(true)
        map.fire("mouseup", makeMouseEvent(15, 15, { shiftKey: true }))

        await afterNextRender()
        expect(map.getContainer().className.indexOf("mouse-move") > -1, "mouse-move class has been set").toBe(true)
        const fireArgs = getFireArgs()
        const args = fireArgs.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have one feature selected").toBe(1)
            expect(payload(args[0], hasFeatures).features[0].id, "should be the feature we expect to be selected").toBe(
                id,
            )
        }

        const actionableArgs = fireArgs.filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = payload(actionableArgs[actionableArgs.length - 1], hasActions)
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(false)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }

        cleanUp()
    })

    it("box select many features", async () => {
        const features = []
        for (let i = 0; i < 5; i++) {
            features.push(getGeoJSON("point"))
        }
        const ids = Draw.add({
            type: "FeatureCollection",
            features,
        })
        fireSpy.mockClear()

        await afterNextRender()
        dragPanEnable.mockClear()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        map.fire(
            "mousemove",
            makeMouseEvent(15, 15, {
                shiftKey: true,
                buttons: 1,
            }),
        )
        map.fire("mouseup", makeMouseEvent(15, 15, { shiftKey: true }))

        await afterNextRender()
        const fireArgs = getFireArgs()
        const args = fireArgs.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one select event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have all features selected").toBe(ids.length)
        }

        const actionableArgs = fireArgs.filter(arg => arg[0] === "draw.actionable")
        expect(actionableArgs.length > 0, "should have fired an actionable event").toBeTruthy()
        if (actionableArgs.length > 0) {
            const actionable = payload(actionableArgs[actionableArgs.length - 1], hasActions)
            expect(actionable.actions.combineFeatures, "should fire correct combine actionable").toBe(true)
            expect(actionable.actions.uncombineFeatures, "should fire correct uncombine actionable").toBe(false)
            expect(actionable.actions.trash, "should fire correct trash actionable").toBe(true)
        }

        cleanUp()
    })

    it("box select over no points", async () => {
        Draw.add(getGeoJSON("point"))
        fireSpy.mockClear()

        await afterNextRender()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        map.fire(
            "mousemove",
            makeMouseEvent(-15, -15, {
                shiftKey: true,
                buttons: 1,
            }),
        )
        map.fire("mouseup", makeMouseEvent(-15, -15, { shiftKey: true }))

        await afterNextRender()
        expect(
            getFireArgs().filter(arg => arg[0] === "draw.selectionchange").length,
            "there should be no draw.selectionchange event",
        ).toBe(0)
        cleanUp()
    })

    it("box select then mousemove", async () => {
        Draw.add(getGeoJSON("point"))
        fireSpy.mockClear()

        await afterNextRender()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        map.fire("mousemove", makeMouseEvent(15, 15, { shiftKey: true }))
        // This mousemove (not a drag) cancels the box select
        map.fire("mousemove", makeMouseEvent(15, 15))
        map.fire("mouseup", makeMouseEvent(15, 15, { shiftKey: true }))

        await afterNextRender()
        expect(
            getFireArgs().filter(arg => arg[0] === "draw.selectionchange").length,
            "there should be no draw.selectionchange event",
        ).toBe(0)
        cleanUp()
    })

    it("deselect", async () => {
        const id = Draw.add(getGeoJSON("point"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })

        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(15, 15))
        map.fire("mouseup", makeMouseEvent(15, 15))

        await afterNextRender()
        const args = getFireArgs().filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have no features selected").toBe(0)
        }
        cleanUp()
    })

    it("click on a deselected feature", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select")

        await afterNextRender()
        fireSpy.mockClear()
        doubleClickZoomDisable.mockClear()
        map.fire("mousedown", makeMouseEvent(50, 30))
        map.fire("mouseup", makeMouseEvent(50, 30))

        await afterNextRender()
        expect(doubleClickZoomDisable, "disable doubleClickZoom").toHaveBeenCalledTimes(1)
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have only one feature selected").toBe(1)
            expect(payload(args[0], hasFeatures).features[0].id, "should be the feature we expect to be selected").toBe(
                id,
            )
        }
        cleanUp()
    })

    it("tap on a deselected feature", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select")

        await afterNextRender()
        fireSpy.mockClear()
        doubleClickZoomDisable.mockClear()
        map.fire("touchstart", makeTouchEvent(50, 30))
        map.fire("touchend", makeTouchEvent(50, 30))

        await afterNextRender()
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have only one feature selected").toBe(1)
            expect(payload(args[0], hasFeatures).features[0].id, "should be the feature we expect to be selected").toBe(
                id,
            )
        }
        cleanUp()
    })

    it("click on a selected feature with shift down", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })

        await afterNextRender()
        fireSpy.mockClear()
        doubleClickZoomDisable.mockClear()
        map.fire("mousedown", makeMouseEvent(50, 30, { shiftKey: true }))
        map.fire("mouseup", makeMouseEvent(50, 30, { shiftKey: true }))

        await afterNextRender()
        expect(doubleClickZoomDisable, "disable doubleClickZoom").toHaveBeenCalledTimes(1)
        expect(map.getContainer().className.indexOf("mouse-pointer") > -1, "mouse-pointer class has been set").toBe(
            true,
        )
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have no features selected").toBe(0)
        }
        cleanUp()
    })

    it("delete selected features", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })
        fireSpy.mockClear()
        Draw.trash()
        await afterNextRender()
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.delete")
        expect(args.length, "should have one and only one draw.delete event").toBe(1)
        expect(payload(args[0], hasFeatures).features.length, "should delete only one feature").toBe(1)
        expect(payload(args[0], hasFeatures).features[0].id, "should delete the feature we expect it to delete").toBe(
            id,
        )

        const selectedFeatures = Draw.getSelectedIds()
        expect(selectedFeatures.length, "nothing should be selected anymore").toBe(0)
        cleanUp()
    })

    it("click on a selected feature with shift up to enter direct_select", async () => {
        Draw.deleteAll()
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })

        await afterNextRender()
        doubleClickZoomEnable.mockClear()
        fireSpy.mockClear()
        doubleClickZoomDisable.mockClear()
        map.fire("mousedown", makeMouseEvent(50, 30))
        map.fire("mouseup", makeMouseEvent(50, 30))

        await afterNextRender()
        expect(
            doubleClickZoomDisable,
            "disable doubleClickZoom. Once for click, once for direct_select",
        ).toHaveBeenCalledTimes(2)
        expect(doubleClickZoomEnable, "double click zoom has been enabled").toHaveBeenCalledTimes(1)
        expect(map.getContainer().className.indexOf("mouse-move") > -1, "mouse-move class has been set").toBe(true)
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.modechange")
        expect(args.length, "should have one and only one modechange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasMode).mode, "should change to direct select").toBe("direct_select")
        }
        cleanUp()
    })

    it("click on a vertex to enter direct_select", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })

        const clickPosition = getGeoJSON("polygon").geometry.coordinates[0][0]

        await afterNextRender()
        doubleClickZoomEnable.mockClear()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(clickPosition[0], clickPosition[1]))
        map.fire("mouseup", makeMouseEvent(clickPosition[0], clickPosition[1]))

        await afterNextRender()
        expect(doubleClickZoomEnable, "double click zoom has been enabled").toHaveBeenCalledTimes(1)
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.modechange")
        expect(args.length, "should have one and only one modechange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasMode).mode, "should change to direct select").toBe("direct_select")
        }
        cleanUp()
    })

    it("tap on a vertex to enter direct_select", async () => {
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [id] })

        const tapPosition = getGeoJSON("polygon").geometry.coordinates[0][0]

        await afterNextRender()
        doubleClickZoomEnable.mockClear()
        fireSpy.mockClear()
        map.fire("touchstart", makeTouchEvent(tapPosition[0], tapPosition[1]))
        map.fire("touchend", makeTouchEvent(tapPosition[0], tapPosition[1]))

        await afterNextRender()
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.modechange")
        expect(args.length, "should have one and only one modechange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasMode).mode, "should change to direct select").toBe("direct_select")
        }
        cleanUp()
    })

    it("click on a deselected feature with shift down while having another feature selected", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })

        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(50, 30, { shiftKey: true }))
        map.fire("mouseup", makeMouseEvent(50, 30, { shiftKey: true }))

        await afterNextRender()
        expect(map.getContainer().className.indexOf("mouse-move") > -1, "mouse-move class has been set").toBe(true)
        expect(Draw.getSelectedIds().indexOf(pointId) !== -1, "point is still selected").toBe(true)
        expect(Draw.getSelectedIds().indexOf(id) !== -1, "polygon is now selected").toBe(true)
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have two features selected").toBe(2)
            expect(payload(args[0], hasFeatures).features[0].id, "selection includes point").toBe(pointId)
            expect(payload(args[0], hasFeatures).features[1].id, "selection includes polygon").toBe(id)
        }
        cleanUp()
    })

    it("click on a deselected feature with shift up, while having another feature selected", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        const id = Draw.add(getGeoJSON("polygon"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })

        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(50, 30))
        map.fire("mouseup", makeMouseEvent(50, 30))

        await afterNextRender()
        expect(map.getContainer().className.indexOf("mouse-move") > -1, "mouse-move class has been set").toBe(true)
        expect(Draw.getSelectedIds().indexOf(pointId) === -1, "point is no longer selected").toBe(true)
        expect(Draw.getSelectedIds().indexOf(id) !== -1, "polygon is now selected").toBe(true)
        let args = getFireArgs()
        args = args.filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have one and only one selectionchange event").toBe(1)
        if (args.length > 0) {
            expect(payload(args[0], hasFeatures).features.length, "should have only one feature selected").toBe(1)
            expect(payload(args[0], hasFeatures).features[0].id, "should be the feature we expect to be selected").toBe(
                id,
            )
        }
        cleanUp()
    })

    it("drag every feature type", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        const multiPointId = Draw.add(getGeoJSON("multiPoint"))[0]
        const lineStringId = Draw.add(getGeoJSON("line"))[0]
        const multiLineStringId = Draw.add(getGeoJSON("multiLineString"))[0]
        const polygonId = Draw.add(getGeoJSON("polygon"))[0]
        const multiPolygonId = Draw.add(getGeoJSON("multiPolygon"))[0]

        const countPositions = (geometry: { coordinates: unknown[] }) =>
            geometry.coordinates.join(",").split(",").length

        const startPosition = getGeoJSON("point").geometry.coordinates
        Draw.changeMode("simple_select", {
            featureIds: [pointId, multiPointId, lineStringId, multiLineStringId, polygonId, multiPolygonId],
        })
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))

        const movedPoint = geometryOf(Draw.get(pointId), "Point")
        expect(movedPoint.coordinates[0], "point lng moved").toBe(startPosition[0] + 25)
        expect(movedPoint.coordinates[1], "point lat moved").toBe(startPosition[1] + 25)
        expect(countPositions(movedPoint), "point has same number of postions").toBe(
            countPositions(getGeoJSON("point").geometry),
        )

        const movedMultiPoint = geometryOf(Draw.get(multiPointId), "MultiPoint")
        expect(movedMultiPoint.coordinates[0][0], "multipoint lng moved").toBe(
            getGeoJSON("multiPoint").geometry.coordinates[0][0] + 25,
        )
        expect(movedMultiPoint.coordinates[0][1], "multipoint lat moved").toBe(
            getGeoJSON("multiPoint").geometry.coordinates[0][1] + 25,
        )
        expect(countPositions(movedMultiPoint), "multiPoint has same number of postions").toBe(
            countPositions(getGeoJSON("multiPoint").geometry),
        )

        const movedLineString = geometryOf(Draw.get(lineStringId), "LineString")
        expect(movedLineString.coordinates[0][0], "line lng moved").toBe(
            getGeoJSON("line").geometry.coordinates[0][0] + 25,
        )
        expect(movedLineString.coordinates[0][1], "line lat moved").toBe(
            getGeoJSON("line").geometry.coordinates[0][1] + 25,
        )
        expect(countPositions(movedLineString), "line has same number of postions").toBe(
            countPositions(getGeoJSON("line").geometry),
        )

        const movedMultiLineString = geometryOf(Draw.get(multiLineStringId), "MultiLineString")
        expect(movedMultiLineString.coordinates[0][0][0], "multiLineString lng moved").toBe(
            getGeoJSON("multiLineString").geometry.coordinates[0][0][0] + 25,
        )
        expect(movedMultiLineString.coordinates[0][0][1], "multiLineString lat moved").toBe(
            getGeoJSON("multiLineString").geometry.coordinates[0][0][1] + 25,
        )
        expect(countPositions(movedMultiLineString), "multiLineString has same number of postions").toBe(
            countPositions(getGeoJSON("multiLineString").geometry),
        )

        const movedPolygon = geometryOf(Draw.get(polygonId), "Polygon")
        expect(movedPolygon.coordinates[0][0][0], "polygon lng moved").toBe(
            getGeoJSON("polygon").geometry.coordinates[0][0][0] + 25,
        )
        expect(movedPolygon.coordinates[0][0][1], "polygon lat moved").toBe(
            getGeoJSON("polygon").geometry.coordinates[0][0][1] + 25,
        )
        expect(countPositions(movedPolygon), "polygon has same number of postions").toBe(
            countPositions(getGeoJSON("polygon").geometry),
        )

        const movedMultiPolygon = geometryOf(Draw.get(multiPolygonId), "MultiPolygon")
        expect(movedMultiPolygon.coordinates[0][0][0][0], "multiPolygon lng moved").toBe(
            getGeoJSON("multiPolygon").geometry.coordinates[0][0][0][0] + 25,
        )
        expect(movedMultiPolygon.coordinates[0][0][0][1], "multiPolygon lat moved").toBe(
            getGeoJSON("multiPolygon").geometry.coordinates[0][0][0][1] + 25,
        )
        expect(countPositions(movedMultiPolygon), "multiPolygon has same number of postions").toBe(
            countPositions(getGeoJSON("multiPolygon").geometry),
        )

        cleanUp()
    })

    it("interrupt drag move with mousemove", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })
        const startPosition = getGeoJSON("point").geometry.coordinates
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        // Dragging
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        // Not dragging
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))

        const movedPoint = geometryOf(Draw.get(pointId), "Point")
        expect(movedPoint.coordinates[0], "point lng moved only the first amount").toBe(startPosition[0] + 15)
        expect(movedPoint.coordinates[1], "point lat moved only the first amount").toBe(startPosition[1] + 15)

        cleanUp()
    })

    it("fire one update when dragging mouse leaves container and button is released outside", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })
        const startPosition = getGeoJSON("point").geometry.coordinates
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))

        const movedPoint = geometryOf(Draw.get(pointId), "Point")
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(movedPoint.coordinates[0], "point lng moved only the first amount").toBe(startPosition[0] + 15)
        expect(movedPoint.coordinates[1], "point lat moved only the first amount").toBe(startPosition[1] + 15)

        cleanUp()
    })

    it("fire two update when dragging mouse leaves container then returns and button is released inside", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })
        const startPosition = getGeoJSON("point").geometry.coordinates
        await afterNextRender()
        fireSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(startPosition[0], startPosition[1]))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 15, startPosition[1] + 15, { buttons: 1 }))
        mapContainer.dispatchEvent(new MouseEvent("mouseout"))
        map.fire("mousemove", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25, { buttons: 1 }))
        map.fire("mouseup", makeMouseEvent(startPosition[0] + 25, startPosition[1] + 25))

        const movedPoint = geometryOf(Draw.get(pointId), "Point")
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called twice").toBe(2)
        expect(movedPoint.coordinates[0], "point lng moved to the mouseup location").toBe(startPosition[0] + 25)
        expect(movedPoint.coordinates[1], "point lat moved to the mouseup location").toBe(startPosition[1] + 25)
    })

    it("on closing invalid line", () => {
        Draw.changeMode("draw_line_string")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(1, 1))
        expect(Draw.getMode(), "should be in simple_select mode").toBe("simple_select")
        expect(Draw.getSelected().features.length, "should not get any selected features").toBe(0)
        expect(Reflect.get(context.store, "_emitSelectionChange"), "should not emit selection change").toBe(undefined)
        cleanUp()
    })

    it("on closing invalid polygon", () => {
        Draw.changeMode("draw_polygon")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        mouseClick(map, makeMouseEvent(16, 16))
        expect(Draw.getMode(), "should be in simple_select mode").toBe("simple_select")
        expect(Draw.getSelected().features.length, "should not get any selected features").toBe(0)
        expect(Reflect.get(context.store, "_emitSelectionChange"), "should not emit selection change").toBe(undefined)
        cleanUp()
    })

    it("fire one update after moving point with touch", async () => {
        const pointId = Draw.add(getGeoJSON("point"))[0]
        Draw.changeMode("simple_select", { featureIds: [pointId] })
        const startPosition = getGeoJSON("point").geometry.coordinates
        const endPosition = [startPosition[0] + TAP_TOLERANCE, startPosition[1] + TAP_TOLERANCE]
        await afterNextRender()
        fireSpy.mockClear()
        doubleClickZoomDisable.mockClear()
        map.fire("touchstart", makeTouchEvent(startPosition[0], startPosition[1]))
        await new Promise(resolve => setTimeout(resolve, TAP_INTERVAL))
        map.fire("touchmove", makeTouchEvent(endPosition[0], endPosition[1]))
        map.fire("touchend", makeTouchEvent(endPosition[0], endPosition[1]))

        const movedPoint = geometryOf(Draw.get(pointId), "Point")
        const args = getFireArgs().filter(arg => arg[0] === "draw.update")
        expect(args.length, "draw.update called once").toBe(1)
        expect(movedPoint.coordinates[0], "point lng moved to the last touchmove position").toBe(endPosition[0])
        expect(movedPoint.coordinates[1], "point lat moved the last touchmove position").toBe(endPosition[1])
        cleanUp()
    })
})
