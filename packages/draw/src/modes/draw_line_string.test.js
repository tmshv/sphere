import { afterAll, beforeAll, describe, expect, it } from "vitest"
import MapboxDraw from "../index"
import LineString from "../feature_types/line_string"
import drawLineStringModeObject from "./draw_line_string"
import objectToMode from "./object_to_mode"
import setupAfterNextRender from "../test-utils/after_next_render"
import createMap from "../test-utils/create_map"
import createMockDrawModeContext from "../test-utils/create_mock_draw_mode_context"
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
import touchTap from "../test-utils/touch_tap"
import waitForLoad from "../test-utils/wait_for_load"

const drawLineStringMode = objectToMode(drawLineStringModeObject)

describe("draw_line_string", () => {
    it("mode initialization", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        expect(context.store.add, "store.add called").toHaveBeenCalledTimes(1)

        const emptyLine = new LineString(context, {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [],
            },
        })
        // Strip ids for this comparison
        const [added] = context.store.add.mock.calls[0]
        expect({ ...added, id: null }, "with a new line").toEqual({ ...emptyLine, id: null })
    })

    it("start", async () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        expect(context.store.clearSelected, "store.clearSelected called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses received correct arguments").toHaveBeenNthCalledWith(1, {
            mouse: "add",
        })
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(1)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            1,
            "line_string",
        )

        await new Promise(resolve => setTimeout(resolve, 10))
        expect(context.map.doubleClickZoom.disable).toHaveBeenCalledTimes(1)
    })

    it("stop with valid line", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        // Fake a valid line
        const line = context.store.get(context.store.getAllIds()[0])
        line.isValid = () => true

        mode.stop.call()
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete not called").toHaveBeenCalledTimes(0)
    })

    it("stop with invalid line", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        // Fake an invalid line
        const line = context.store.get(context.store.getAllIds()[0])
        line.isValid = () => false

        mode.stop.call()
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete called").toHaveBeenCalledTimes(1)
        if (context.store.delete.mock.calls.length > 0) {
            expect(context.store.delete, "store.delete received correct arguments").toHaveBeenNthCalledWith(
                1,
                [line.id],
                { silent: true },
            )
        }
    })

    it("render active line with 0 coordinates", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const line = context.store.get(context.store.getAllIds()[0])

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                id: line.id,
            },
            geometry: {
                type: "LineString",
                coordinates: [],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does not render").toBe(0)
    })

    it("render active line with 1 coordinate", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const line = context.store.get(context.store.getAllIds()[0])

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                id: line.id,
            },
            geometry: {
                type: "LineString",
                coordinates: [[0, 0]],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does not render").toBe(0)
    })

    it("render active line with 2 coordinates", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const line = context.store.get(context.store.getAllIds()[0])

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                id: line.id,
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [10, 10],
                ],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does render").toBe(2)
        expect(memo[1], "with active: true, meta: feature").toEqual({
            type: "Feature",
            properties: {
                id: line.id,
                active: "true",
                meta: "feature",
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [10, 10],
                ],
            },
        })
    })

    it("render inactive feature", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                meta: "nothing",
            },
            geometry: {
                type: "Point",
                coordinates: [0, 0],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "does render").toBe(1)
        expect(memo[0], "unaltered except active: false").toEqual({
            type: "Feature",
            properties: {
                active: "false",
                meta: "nothing",
            },
            geometry: {
                type: "Point",
                coordinates: [0, 0],
            },
        })
    })
})

describe("draw_line_string mouse interaction", () => {
    // The following tests share state
    const container = document.createElement("div")
    let map
    let Draw
    let afterNextRender

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        Draw = new MapboxDraw()
        map.addControl(Draw)
        afterNextRender = setupAfterNextRender(map)
        await waitForLoad(map)

        Draw.changeMode("draw_line_string")
    })

    afterAll(() => {
        container.remove()
    })

    it("first click", () => {
        mouseClick(map, makeMouseEvent(10, 20))

        const { features } = Draw.getAll()
        expect(features.length, "line created").toBe(1)
        const line = Draw.getAll().features[0]
        expect(line.geometry.type).toBe("LineString")

        expect(line.geometry.coordinates, "starting coordinate added").toEqual([
            [10, 20],
            [10, 20],
        ])
    })

    it("move mouse", () => {
        map.fire("mousemove", makeMouseEvent(15, 23))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "last coordinate added").toEqual([
            [10, 20],
            [15, 23],
        ])
    })

    it("move mouse again", () => {
        map.fire("mousemove", makeMouseEvent(30, 33))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "last coordinate replaced").toEqual([
            [10, 20],
            [30, 33],
        ])
    })

    it("click to add another vertex", () => {
        mouseClick(map, makeMouseEvent(35, 35))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "last coordinate replaced").toEqual([
            [10, 20],
            [35, 35],
            [35, 35],
        ])
    })

    it("add more points then click on the last vertex to finish", () => {
        mouseClick(map, makeMouseEvent(40, 40))
        mouseClick(map, makeMouseEvent(50, 50))
        mouseClick(map, makeMouseEvent(55, 55))
        mouseClick(map, makeMouseEvent(55, 55))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "all coordinates in place").toEqual([
            [10, 20],
            [35, 35],
            [40, 40],
            [50, 50],
            [55, 55],
        ])

        mouseClick(map, makeMouseEvent(40, 40))
        expect(
            line.geometry.coordinates,
            "since we exited draw_line_string mode, another click does not add a coordinate",
        ).toEqual([
            [10, 20],
            [35, 35],
            [40, 40],
            [50, 50],
            [55, 55],
        ])
    })

    it("start a line but trash it before completion", () => {
        // Start a new line
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates).toEqual([
            [1, 1],
            [2, 2],
            [3, 3],
            [3, 3],
        ])

        Draw.trash()
        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        mouseClick(map, makeMouseEvent(1, 1))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })

    it("start a line but trash it with Escape before completion", () => {
        // Start a new line
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates).toEqual([
            [1, 1],
            [2, 2],
            [3, 3],
            [3, 3],
        ])

        container.dispatchEvent(escapeEvent())

        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })

    // ZERO CLICK TESTS

    it("start a line and end it with Enter", () => {
        // Start a new line
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))
        mouseClick(map, makeMouseEvent(2, 2))
        mouseClick(map, makeMouseEvent(3, 3))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates).toEqual([
            [1, 1],
            [2, 2],
            [3, 3],
            [3, 3],
        ])

        container.dispatchEvent(enterEvent())

        expect(Draw.getAll().features.length, "the feature was added").toBe(1)
        expect(Draw.getAll().features[0].geometry.coordinates, "the line is correct").toEqual([
            [1, 1],
            [2, 2],
            [3, 3],
        ])

        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(1)
    })

    it("start draw_line_string mode then changemode before a click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "and has no coordinates").toEqual([])

        Draw.changeMode("simple_select")
        expect(Draw.getAll().features.length, "line is removed").toBe(0)
    })

    // ONE CLICK TESTS

    it("start draw_line_string mode then enter after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "and has right coordinates").toEqual([
            [1, 1],
            [16, 16],
        ])

        container.dispatchEvent(enterEvent())
        expect(Draw.getAll().features.length, "line_string was removed").toBe(0)
    })

    it("start draw_line_string mode then start a point after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "and has right coordinates").toEqual([
            [1, 1],
            [16, 16],
        ])

        container.dispatchEvent(startPointEvent())
        expect(Draw.get(line.id), "line_string was removed").toBe(undefined)
    })

    it("start draw_line_string mode then start a line_string after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "and has right coordinates").toEqual([
            [1, 1],
            [16, 16],
        ])

        container.dispatchEvent(startLineStringEvent())
        expect(Draw.get(line.id), "line_string was removed").toBe(undefined)
    })

    it("start draw_line_string mode then start a polygon after one click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        map.fire("mousemove", makeMouseEvent(16, 16))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "and has right coordinates").toEqual([
            [1, 1],
            [16, 16],
        ])

        container.dispatchEvent(startPolygonEvent())
        expect(Draw.get(line.id), "line_string was removed").toBe(undefined)
    })

    it("start draw_line_string mode then double click", () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        expect(Draw.getAll().features.length, "line is added").toBe(1)
        mouseClick(map, makeMouseEvent(1, 1))
        mouseClick(map, makeMouseEvent(1, 1))

        expect(Draw.getAll().features.length, "line_string was removed").toBe(0)
    })

    // THREE CLICK TEST

    it("start draw_line_string mode then double click (three clicks)", async () => {
        Draw.deleteAll()
        expect(Draw.getAll().features.length, "no features yet").toBe(0)

        Draw.changeMode("draw_line_string")
        let lineString = Draw.getAll().features[0]
        expect(lineString !== undefined, "line is added").toBe(true)
        mouseClick(map, makeMouseEvent(0, 0))
        await afterNextRender()
        mouseClick(map, makeMouseEvent(15, 15))
        map.fire("mousemove", makeMouseEvent(30, 30))
        await afterNextRender()
        map.fire("mousemove", makeMouseEvent(15, 15))
        mouseClick(map, makeMouseEvent(16, 16))
        lineString = Draw.get(lineString.id)
        expect(lineString !== undefined, "line_string is here").toBe(true)
        expect(lineString, "line_string has the right coordinates").toEqual({
            id: lineString.id,
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: [
                    [0, 0],
                    [15, 15],
                ],
            },
        })
    })
})

describe("draw_line_string touch interaction", () => {
    // The following tests share state
    const container = document.createElement("div")
    let map
    let Draw

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        Draw = new MapboxDraw()
        map.addControl(Draw)
        await waitForLoad(map)

        Draw.changeMode("draw_line_string")
    })

    afterAll(() => {
        container.remove()
    })

    it("first tap", () => {
        touchTap(map, makeTouchEvent(100, 200))

        const { features } = Draw.getAll()
        expect(features.length, "line created").toBe(1)
        const line = Draw.getAll().features[0]
        expect(line.geometry.type).toBe("LineString")

        expect(line.geometry.coordinates, "starting coordinate added").toEqual([
            [100, 200],
            [100, 200],
        ])
    })

    it("tap to add another vertex", () => {
        touchTap(map, makeTouchEvent(200, 400))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "last coordinate replaced").toEqual([
            [100, 200],
            [200, 400],
            [200, 400],
        ])
    })

    it("add more points then tap on the last vertex to finish", () => {
        touchTap(map, makeTouchEvent(400, 500))
        touchTap(map, makeTouchEvent(300, 500))
        touchTap(map, makeTouchEvent(200, 500))
        touchTap(map, makeTouchEvent(200, 500))
        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "all coordinates in place").toEqual([
            [100, 200],
            [200, 400],
            [400, 500],
            [300, 500],
            [200, 500],
        ])

        touchTap(map, makeTouchEvent(700, 700))
        expect(
            line.geometry.coordinates,
            "since we exited draw_line_string mode, another tap does not add a coordinate",
        ).toEqual([
            [100, 200],
            [200, 400],
            [400, 500],
            [300, 500],
            [200, 500],
        ])
    })

    it("start a line but trash it before completion", () => {
        // Start a new line
        Draw.deleteAll()
        Draw.changeMode("draw_line_string")
        touchTap(map, makeTouchEvent(100, 100))
        touchTap(map, makeTouchEvent(200, 200))
        touchTap(map, makeTouchEvent(300, 300))

        const line = Draw.getAll().features[0]
        expect(line.geometry.coordinates).toEqual([
            [100, 100],
            [200, 200],
            [300, 300],
            [300, 300],
        ])

        Draw.trash()
        expect(Draw.getAll().features.length, "no feature added").toBe(0)

        touchTap(map, makeTouchEvent(100, 100))
        expect(Draw.getAll().features.length, "no longer drawing").toBe(0)
    })
})

describe("draw_line_string continue LineString", () => {
    it("continues an existing line", () => {
        const context = createMockDrawModeContext()
        const mode = drawLineStringMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const coordinates = [
            [0, 0],
            [5, 5],
            [10, 10],
        ]
        const geojson = {
            type: "Feature",
            id: 1,
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: coordinates.slice(0),
            },
        }
        const line = new LineString(context, geojson)
        context.store.add(line)
        expect(() => drawLineStringMode(context, { featureId: 2 }).start(lifecycleContext), "wrong feature id").toThrow(
            /featureId/,
        )
        expect(() => drawLineStringMode(context, { featureId: 1 }).start(lifecycleContext), 'no "from" prop').toThrow(
            /from.*property/,
        )
        expect(
            () => drawLineStringMode(context, { featureId: 1, from: "[0, 0]" }).start.call(lifecycleContext),
            "incorrect from prop",
        ).toThrow(/from.*property/)
        expect(
            () => drawLineStringMode(context, { featureId: 1, from: [-1, -1] }).start.call(lifecycleContext),
            "not on line",
        ).toThrow(/start or the end/)
        expect(
            () => drawLineStringMode(context, { featureId: 1, from: [5, 5] }).start.call(lifecycleContext),
            "not at line endpoint",
        ).toThrow(/start or the end/)
        drawLineStringMode(context, { featureId: 1, from: [0, 0] }).start.call(lifecycleContext)

        let testLine = context.store.get(context.store.getAllIds()[0])
        expect(testLine.id, "initialized with correct line").toBe(1)
        expect(testLine.coordinates, "added one coordinate at the start endpoint").toEqual([[0, 0], ...coordinates])

        drawLineStringMode(context, { featureId: 1, from: [10, 10] }).start.call(lifecycleContext)
        testLine = context.store.get(context.store.getAllIds()[0])
        expect(testLine.coordinates, "added one coordinate at the end endpoint").toEqual([
            [0, 0],
            ...coordinates,
            [10, 10],
        ])

        expect(
            () =>
                drawLineStringMode(context, {
                    featureId: 1,
                    from: { type: "Point", coordinates: [0, 0] },
                }).start.call(lifecycleContext),
            "initializes with Point",
        ).not.toThrow()

        expect(
            () =>
                drawLineStringMode(context, {
                    featureId: 1,
                    from: { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: {} },
                }).start.call(lifecycleContext),
            "initializes with a Feature<Point>",
        ).not.toThrow()
    })

    it("mouseClick", async () => {
        const container = document.createElement("div")
        document.body.appendChild(container)
        const map = createMap({ container })
        const Draw = new MapboxDraw()
        map.addControl(Draw)
        const afterNextRender = setupAfterNextRender(map)
        await waitForLoad(map)

        const coordinates = [
            [0, 0],
            [5, 5],
            [10, 10],
        ]
        const geojson = {
            type: "Feature",
            id: 1,
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: coordinates.slice(0),
            },
        }
        Draw.add(geojson)

        Draw.changeMode("draw_line_string", { featureId: 1, from: [0, 0] })
        mouseClick(map, makeMouseEvent(-1, -1))
        await afterNextRender()
        let line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "line continues from the start").toEqual([[-1, -1], [-1, -1], ...coordinates])
        Draw.changeMode("draw_line_string", { featureId: 1, from: [10, 10] })
        mouseClick(map, makeMouseEvent(12, 12))
        await afterNextRender()
        line = Draw.getAll().features[0]
        expect(line.geometry.coordinates, "line continues from the end").toEqual([
            [-1, -1],
            ...coordinates,
            [12, 12],
            [12, 12],
        ])

        container.remove()
    })
})
