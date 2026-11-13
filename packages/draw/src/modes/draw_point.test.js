import { afterAll, beforeAll, describe, expect, it } from "vitest"
import MapboxDraw from "../index"
import Point from "../feature_types/point"
import drawPointModeObject from "./draw_point"
import objectToMode from "./object_to_mode"
import createMap from "../test-utils/create_map"
import createMockDrawModeContext from "../test-utils/create_mock_draw_mode_context"
import createMockLifecycleContext from "../test-utils/create_mock_lifecycle_context"
import { enterEvent, escapeEvent } from "../test-utils/key_events"
import makeMouseEvent from "../test-utils/make_mouse_event"
import makeTouchEvent from "../test-utils/make_touch_event"
import mouseClick from "../test-utils/mouse_click"
import touchTap from "../test-utils/touch_tap"
import waitForLoad from "../test-utils/wait_for_load"

const drawPointMode = objectToMode(drawPointModeObject)

describe("draw_point", () => {
    it("mode initialization", () => {
        const context = createMockDrawModeContext()
        const lifecycleContext = createMockLifecycleContext()
        const mode = drawPointMode(context)
        mode.start.call(lifecycleContext)

        expect(context.store.add, "store.add called").toHaveBeenCalledTimes(1)

        const emptypoint = new Point(context, {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Point",
                coordinates: [],
            },
        })
        // Strip ids for this comparison
        const [added] = context.store.add.mock.lastCall
        expect({ ...added, id: null }, "with a new line").toEqual({ ...emptypoint, id: null })
    })

    it("start", () => {
        const context = createMockDrawModeContext()
        const lifecycleContext = createMockLifecycleContext()
        const mode = drawPointMode(context)
        mode.start.call(lifecycleContext)

        expect(context.store.clearSelected, "store.clearSelected called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses called").toHaveBeenCalledTimes(1)
        expect(context.ui.queueMapClasses, "ui.queueMapClasses received correct arguments").toHaveBeenNthCalledWith(1, {
            mouse: "add",
        })
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(1)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            1,
            "point",
        )

        expect(lifecycleContext.on, "this.on called").toHaveBeenCalledTimes(12)
    })

    it("stop with point placed", () => {
        const context = createMockDrawModeContext()
        const mode = drawPointMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        // Fake a placed point
        const id = context.store.getAllIds()[0]
        const point = context.store.get(id)
        point.updateCoordinate(10, 20)

        mode.stop.call()
        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete not called").toHaveBeenCalledTimes(0)
    })

    it("stop with no point placed", () => {
        const context = createMockDrawModeContext()
        const mode = drawPointMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const id = context.store.getAllIds()[0]
        const point = context.store.get(id)

        mode.stop.call()

        expect(context.ui.setActiveButton, "ui.setActiveButton called").toHaveBeenCalledTimes(2)
        expect(context.ui.setActiveButton, "ui.setActiveButton received correct arguments").toHaveBeenNthCalledWith(
            2,
            undefined,
        )
        expect(context.store.delete, "store.delete called").toHaveBeenCalledTimes(1)
        expect(context.store.delete, "store.delete received correct arguments").toHaveBeenNthCalledWith(1, [point.id], {
            silent: true,
        })
    })

    it("render the active point", () => {
        const context = createMockDrawModeContext()
        const mode = drawPointMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const id = context.store.getAllIds()[0]
        const point = context.store.get(id)

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                id: point.id,
            },
            geometry: {
                type: "Point",
                coordinates: [10, 10],
            },
        }
        mode.render(geojson, x => memo.push(x))
        expect(memo.length, "active point does not render").toBe(0)
    })

    it("render an inactive feature", () => {
        const context = createMockDrawModeContext()
        const mode = drawPointMode(context)
        const lifecycleContext = createMockLifecycleContext()
        mode.start.call(lifecycleContext)

        const memo = []
        const geojson = {
            type: "Feature",
            properties: {
                meta: "nothing",
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [10, 10],
                    [20, 20],
                ],
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
                type: "LineString",
                coordinates: [
                    [10, 10],
                    [20, 20],
                ],
            },
        })
    })
})

describe("draw_point mouse interaction", () => {
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
    })

    afterAll(() => {
        container.remove()
    })

    it("clicking", () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")
        mouseClick(map, makeMouseEvent(10, 20))

        const { features } = Draw.getAll()
        expect(features.length, "point created").toBe(1)
        const point = Draw.getAll().features[0]
        expect(point.geometry.type).toBe("Point")

        expect(point.geometry.coordinates, "coordinate added").toEqual([10, 20])

        mouseClick(map, makeMouseEvent(30, 30))
        expect(features.length, "mode has changed, so another click does not create another point").toBe(1)
    })

    it("exist before clicking by hitting Escape", () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")

        container.dispatchEvent(escapeEvent())

        expect(Draw.getAll().features.length, "no feature added").toBe(0)
        mouseClick(map, makeMouseEvent(30, 30))
        expect(Draw.getAll().features.length, "mode has changed, so a click does not create another point").toBe(0)
    })

    it("exist before clicking by hitting Enter", () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")

        container.dispatchEvent(enterEvent())

        expect(Draw.getAll().features.length, "no feature added").toBe(0)
        mouseClick(map, makeMouseEvent(30, 30))
        expect(Draw.getAll().features.length, "mode has changed, so a click does not create another point").toBe(0)
    })

    it("exist before clicking with Trash", () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")

        Draw.trash()

        expect(Draw.getAll().features.length, "no feature added").toBe(0)
        mouseClick(map, makeMouseEvent(30, 30))
        expect(Draw.getAll().features.length, "mode has changed, so a click does not create another point").toBe(0)
    })
})

describe("draw_point touch interaction", () => {
    const container = document.createElement("div")
    let map
    let Draw

    beforeAll(async () => {
        document.body.appendChild(container)
        map = createMap({ container })
        Draw = new MapboxDraw()
        map.addControl(Draw)
        await waitForLoad(map)
    })

    afterAll(() => {
        container.remove()
    })

    it("tapping", () => {
        Draw.deleteAll()
        Draw.changeMode("draw_point")
        touchTap(map, makeTouchEvent(10, 20))

        const { features } = Draw.getAll()
        expect(features.length, "point created").toBe(1)
        const point = Draw.getAll().features[0]
        expect(point.geometry.type).toBe("Point")

        expect(point.geometry.coordinates, "coordinate added").toEqual([10, 20])

        touchTap(map, makeTouchEvent(30, 30))
        expect(features.length, "mode has changed, so another click does not create another point").toBe(1)
    })
})
