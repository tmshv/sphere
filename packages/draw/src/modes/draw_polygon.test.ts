import { afterAll, beforeAll, describe, expect, it } from "vitest"
import MapLibreDraw from "../index"
import type { DrawRenderFeature, DrawExportedFeature } from "../types"
import Polygon from "../feature_types/polygon"
import drawPolygonModeObject from "./draw_polygon"
import objectToMode from "./object_to_mode"
import setupAfterNextRender, { type AfterNextRender } from "../test-utils/after_next_render"
import createMap, { type MockMap } from "../test-utils/create_map"
import createMockDrawModeContext, { type MockDrawModeContext } from "../test-utils/create_mock_draw_mode_context"
import createMockLifecycleContext from "../test-utils/create_mock_lifecycle_context"
import {
    enterEvent,
    escapeEvent,
    startLineStringEvent,
    startPointEvent,
    startPolygonEvent,
} from "../test-utils/key_events"
import makeMouseEvent from "../test-utils/make_mouse_event"
import makeTouchEvent from "../test-utils/make_touch_event"
import mouseClick from "../test-utils/mouse_click"
import required from "../test-utils/required"
import touchTap from "../test-utils/touch_tap"
import waitForLoad from "../test-utils/wait_for_load"

const drawPolygonMode = objectToMode(drawPolygonModeObject)

/** The first feature the mode added to the store. */
function addedPolygon(context: MockDrawModeContext) {
    return required(context.store.get(required(context.store.getAllIds().at(0))))
}

/** The first feature Draw holds, as GeoJSON. */
function firstFeature(draw: MapLibreDraw): DrawExportedFeature {
    return required(draw.getAll().features.at(0))
}

/** The coordinates of an exported feature; a geometry collection has none. */
function coordinates(feature: DrawExportedFeature): unknown {
    if (feature.geometry.type === "GeometryCollection") return undefined
    return feature.geometry.coordinates
}

describe("draw_polygon", () => {
    it("mode initialization", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        expect(context.store.add, "store.add called").toHaveBeenCalledTimes(1)

        const emptyPolygon = new Polygon(context, {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Polygon",
                coordinates: [[]],
            },
        })
        // Strip ids for this comparison
        const [added] = required(context.store.add.mock.calls.at(0))
        expect({ ...added, id: null }, "with a new polygon").toEqual({ ...emptyPolygon, id: null })
    })

    it("start", async () => {
        const context = createMockDrawModeContext()
        const lifecycleContext = createMockLifecycleContext()
        const mode = drawPolygonMode(context)

        mode.start.call(lifecycleContext)
        expect(context.store.clearSelected, "store.clearSelected called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses received correct arguments").toHaveBeenNthCalledWith(1, {
            mouse: "add",
        })
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(1)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            1,
            "polygon",
        )

        await new Promise(resolve => setTimeout(resolve, 10))
        expect(context.map.doubleClickZoom.disable).toHaveBeenCalledTimes(1)
    })

    it("stop with valid polygon", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        // Fake a valid polygon
        const testPolygon = addedPolygon(context)
        testPolygon.isValid = () => true

        required(mode.stop)()
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete not called").toHaveBeenCalledTimes(0)
    })

    it("stop with invalid polygon", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        // Fake an invalid polygon
        const testPolygon = addedPolygon(context)
        testPolygon.isValid = () => false

        required(mode.stop)()
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete called").toHaveBeenCalledTimes(1)
        expect(context.store.delete, "store.delete received correct arguments").toHaveBeenNthCalledWith(
            1,
            [testPolygon.id],
            { silent: true },
        )
    })

    it("render active polygon with no coordinates", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)
        const testPolygon = addedPolygon(context)

        const memo: DrawRenderFeature[] = []
        const geojson: DrawRenderFeature = {
            type: "Feature",
            properties: {
                id: testPolygon.id,
            },
            geometry: {
                type: "Polygon",
                coordinates: [],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does not render").toBe(0)
    })

    it("render active polygon with 1 coordinate (and closer)", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)
        const testPolygon = addedPolygon(context)

        const memo: DrawRenderFeature[] = []
        const geojson: DrawRenderFeature = {
            type: "Feature",
            properties: {
                id: testPolygon.id,
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [10, 10],
                        [10, 10],
                    ],
                ],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does not render").toBe(0)
    })

    it("render active polygon with 2 coordinates (and closer)", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)
        const testPolygon = addedPolygon(context)

        const memo: DrawRenderFeature[] = []
        const geojson: DrawRenderFeature = {
            type: "Feature",
            properties: {
                id: testPolygon.id,
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [0, 0],
                        [0, 10],
                        [0, 0],
                    ],
                ],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does render").toBe(2)
        expect(memo.at(1), "renders as a LineString with meta: feature, active: true").toEqual({
            type: "Feature",
            properties: {
                id: testPolygon.id,
                active: "true",
                meta: "feature",
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [0, 10],
                ],
            },
        })
    })

    it("render active polygon with 3 coordinates (and closer)", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)
        const testPolygon = addedPolygon(context)

        const memo: DrawRenderFeature[] = []
        const geojson: DrawRenderFeature = {
            type: "Feature",
            properties: {
                id: testPolygon.id,
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [0, 0],
                        [0, 10],
                        [10, 10],
                        [10, 0],
                        [0, 0],
                    ],
                ],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does render").toBe(3)
        expect(memo.at(0), "renders the start point point with meta: vertex").toEqual({
            type: "Feature",
            properties: {
                parent: testPolygon.id,
                meta: "vertex",
                coord_path: "0.0",
                active: "false",
            },
            geometry: {
                type: "Point",
                coordinates: [0, 0],
            },
        })
        expect(memo.at(1), "renders end point with meta: vertex").toEqual({
            type: "Feature",
            properties: {
                parent: testPolygon.id,
                meta: "vertex",
                coord_path: "0.2",
                active: "false",
            },
            geometry: {
                type: "Point",
                coordinates: [10, 10],
            },
        })
        expect(memo.at(2), "renders as a polygon with meta: feature, active: true").toEqual({
            type: "Feature",
            properties: {
                id: testPolygon.id,
                active: "true",
                meta: "feature",
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [0, 0],
                        [0, 10],
                        [10, 10],
                        [10, 0],
                        [0, 0],
                    ],
                ],
            },
        })
    })

    it("render inactive feature", () => {
        const context = createMockDrawModeContext()
        const mode = drawPolygonMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const memo: DrawRenderFeature[] = []
        const geojson: DrawRenderFeature = {
            type: "Feature",
            properties: {
                meta: "meh",
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [0, 10],
                ],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does render").toBe(1)
        expect(memo.at(0), "unaltered except active: false").toEqual({
            type: "Feature",
            properties: {
                active: "false",
                meta: "meh",
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [0, 10],
                ],
            },
        })
    })
})

describe("draw_polygon mouse interaction", () => {
    // The following tests share state
    const container = document.createElement("div")
    let map: MockMap
    let Draw: MapLibreDraw
    let afterNextRender: AfterNextRender

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        Draw = new MapLibreDraw()
        map.addControl(Draw)
        await waitForLoad(map)

        afterNextRender = setupAfterNextRender(map)
        Draw.changeMode("draw_polygon")
    })

    afterAll(() => {
        container.remove()
    })

    it("first click", () => {
        mouseClick(map, makeMouseEvent(10, 20))

        const { features } = Draw.getAll()
        expect(features.length, "polygon created").toBe(1)
        const polygon = firstFeature(Draw)
        expect(polygon.geometry.type).toBe("Polygon")

        expect(coordinates(polygon), "starting coordinate added").toEqual([
            [
                [10, 20],
                [10, 20],
                [10, 20],
            ],
        ])
    })

    it("move mouse", () => {
        map.fire("mousemove", makeMouseEvent(15, 23))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "middle coordinate added").toEqual([
            [
                [10, 20],
                [15, 23],
                [10, 20],
            ],
        ])
    })

    it("move mouse again", () => {
        map.fire("mousemove", makeMouseEvent(30, 33))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "middle coordinate replaced").toEqual([
            [
                [10, 20],
                [30, 33],
                [10, 20],
            ],
        ])
    })

    it("click to add another vertex", () => {
        mouseClick(map, makeMouseEvent(35, 35))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "middle coordinate replaced").toEqual([
            [
                [10, 20],
                [35, 35],
                [35, 35],
                [10, 20],
            ],
        ])
    })

    it("add more points then click on the last vertex to finish", () => {
        mouseClick(map, makeMouseEvent(40, 40))
        mouseClick(map, makeMouseEvent(50, 50))
        mouseClick(map, makeMouseEvent(55, 55))
        mouseClick(map, makeMouseEvent(55, 55))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "all coordinates in place").toEqual([
            [
                [10, 20],
                [35, 35],
                [40, 40],
                [50, 50],
                [55, 55],
                [10, 20],
            ],
        ])

        mouseClick(map, makeMouseEvent(40, 40))
        expect(
            coordinates(polygon),
            "since we exited draw_polygon mode, another click does not add a coordinate",
        ).toEqual([
            [
                [10, 20],
                [35, 35],
                [40, 40],
                [50, 50],
                [55, 55],
                [10, 20],
            ],
        ])
    })

    it("start a polygon but trash it before completion", () => {
        // Start a new polygon
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon)).toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [3, 3],
                [1, 1],
            ],
        ])

        Draw.trash()
        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        mouseClick(map, makeMouseEvent(1, 1))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })

    it("start a polygon but trash it with Escape before completion", () => {
        // Start a new polygon
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon)).toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [3, 3],
                [1, 1],
            ],
        ])

        container.dispatchEvent(escapeEvent())

        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        mouseClick(map, makeMouseEvent(1, 1))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })

    // ZERO CLICK TESTS

    it("start a polygon and end it with Enter", () => {
        // Start a new polygon
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon)).toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [3, 3],
                [1, 1],
            ],
        ])

        container.dispatchEvent(enterEvent())

        expect(Draw.getAll().features.length, "the feature was added").toBe(1)
        expect(coordinates(firstFeature(Draw)), "the polygon is correct").toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [1, 1],
            ],
        ])

        mouseClick(map, makeMouseEvent(1, 1))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(1)
    })

    it("start draw_polygon mode then changemode before a click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        const polygon = firstFeature(Draw)
        expect(polygon.geometry.type).toEqual("Polygon")

        Draw.changeMode("simple_select")
        expect(Draw.getAll().features.length, "polygon is removed").toBe(0)
    })

    // ONE CLICK TESTS

    it("start draw_polygon mode then enter after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [1, 1],
            ],
        ])

        container.dispatchEvent(enterEvent())
        expect(Draw.getAll().features.length, "polygon was removed").toBe(0)
    })

    it("start draw_polygon mode then start a point after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startPointEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then start a line_string after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startLineStringEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then start a new polygon after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startPolygonEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then doubleclick", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(1, 1))

        expect(Draw.getAll().features.length, "polygon was removed").toBe(0)
    })

    // TWO CLICK TESTS

    it("start draw_polygon mode then enter after two clicks", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        map.fire("mousemove", makeMouseEvent(8, 0))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [8, 0],
                [1, 1],
            ],
        ])

        container.dispatchEvent(enterEvent())
        expect(Draw.getAll().features.length, "polygon was removed").toBe(0)
    })

    it("start draw_polygon mode then start a point after two clicks", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        map.fire("mousemove", makeMouseEvent(8, 0))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [8, 0],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startPointEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then start a line_string after two clicks", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        map.fire("mousemove", makeMouseEvent(8, 0))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [8, 0],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startLineStringEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then start a new polygon after two clicks", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        map.fire("mousemove", makeMouseEvent(8, 0))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "and has right coordinates").toEqual([
            [
                [1, 1],
                [16, 16],
                [8, 0],
                [1, 1],
            ],
        ])

        container.dispatchEvent(startPolygonEvent())
        expect(Draw.get(required(polygon.id)), "polygon was removed").toBe(undefined)
    })

    it("start draw_polygon mode then doubleclick (after two clicks)", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_polygon")
        expect(Draw.getAll().features.length, "polygon is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(16, 16))
        mouseClick(map, makeMouseEvent(16, 16))

        expect(Draw.getAll().features.length, "polygon was removed").toBe(0)
    })

    // FIVE CLICK TEST

    it("end draw_polygon mode by clicking on the start point", async () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)
        Draw.changeMode("draw_polygon")
        let polygon: DrawExportedFeature | undefined = Draw.getAll().features.at(0)
        expect(polygon !== undefined, "polygon is added").toBe(true)
        mouseClick(map, makeMouseEvent(0, 0))
        mouseClick(map, makeMouseEvent(20, 0))
        mouseClick(map, makeMouseEvent(20, 20))
        mouseClick(map, makeMouseEvent(0, 20))

        await afterNextRender()
        map.fire("mousemove", makeMouseEvent(0, 0))
        mouseClick(map, makeMouseEvent(0, 0))

        polygon = Draw.get(required(required(polygon).id))
        expect(coordinates(required(polygon)), "and has right coordinates").toEqual([
            [
                [0, 0],
                [20, 0],
                [20, 20],
                [0, 20],
                [0, 0],
            ],
        ])
        Draw.deleteAll()
    })
})

describe("draw_polygon touch interaction", () => {
    // The following tests share state
    const container = document.createElement("div")
    let map: MockMap
    let Draw: MapLibreDraw

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        Draw = new MapLibreDraw()
        map.addControl(Draw)
        await waitForLoad(map)

        Draw.changeMode("draw_polygon")
    })

    afterAll(() => {
        container.remove()
    })

    it("first tap", () => {
        touchTap(map, makeTouchEvent(100, 200))

        const { features } = Draw.getAll()
        expect(features.length, "polygon created").toBe(1)
        const polygon = firstFeature(Draw)
        expect(polygon.geometry.type).toBe("Polygon")

        expect(coordinates(polygon), "starting coordinate added").toEqual([
            [
                [100, 200],
                [100, 200],
                [100, 200],
            ],
        ])
    })

    it("tap to add another vertex", () => {
        touchTap(map, makeTouchEvent(135, 135))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "middle coordinate replaced").toEqual([
            [
                [100, 200],
                [135, 135],
                [135, 135],
                [100, 200],
            ],
        ])
    })

    it("add more points then tap on the last vertex to finish", () => {
        touchTap(map, makeTouchEvent(400, 400))
        touchTap(map, makeTouchEvent(500, 500))
        touchTap(map, makeTouchEvent(550, 550))
        touchTap(map, makeTouchEvent(550, 550))
        const polygon = firstFeature(Draw)
        expect(coordinates(polygon), "all coordinates in place").toEqual([
            [
                [100, 200],
                [135, 135],
                [400, 400],
                [500, 500],
                [550, 550],
                [100, 200],
            ],
        ])

        touchTap(map, makeTouchEvent(400, 400))
        expect(
            coordinates(polygon),
            "since we exited draw_polygon mode, another tap does not add a coordinate",
        ).toEqual([
            [
                [100, 200],
                [135, 135],
                [400, 400],
                [500, 500],
                [550, 550],
                [100, 200],
            ],
        ])
    })

    it("start a polygon but trash it before completion", () => {
        // Start a new polygon
        Draw.deleteAll()
        Draw.changeMode("draw_polygon")
        touchTap(map, makeTouchEvent(100, 100))
        touchTap(map, makeTouchEvent(200, 200))
        touchTap(map, makeTouchEvent(300, 300))

        const polygon = firstFeature(Draw)
        expect(coordinates(polygon)).toEqual([
            [
                [100, 100],
                [200, 200],
                [300, 300],
                [300, 300],
                [100, 100],
            ],
        ])

        Draw.trash()
        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        touchTap(map, makeTouchEvent(1, 1))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })
})
