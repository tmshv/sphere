import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import setupAfterNextRender from "../test-utils/after_next_render"
import createMap from "../test-utils/create_map"
import getGeoJSON from "../test-utils/get_geojson"
import makeMouseEvent from "../test-utils/make_mouse_event"
import waitForLoad from "../test-utils/wait_for_load"

// Local copy of @mapbox/mapbox-gl-draw-static-mode (not installed in this package)
const staticMode = {
    onSetup() {
        this.setActionableState()
        return {}
    },
    toDisplayFeatures(_, geojson, display) {
        display(geojson)
    },
}

describe("static", () => {
    let map
    let Draw
    let afterNextRender

    function cleanUp() {
        Draw.deleteAll()
        map.fire.mockClear()
    }

    function getFireArgs() {
        return [...map.fire.mock.calls]
    }

    beforeAll(async () => {
        map = createMap()
        const opts = {
            modes: {
                static: staticMode,
            },
            defaultMode: "static",
        }
        Draw = new MapboxDraw(opts)
        map.addControl(Draw)

        vi.spyOn(map, "fire")
        map.dragPan.disable()
        vi.spyOn(map.dragPan, "disable")

        afterNextRender = setupAfterNextRender(map)

        await waitForLoad(map)
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })

    it("static - box select", async () => {
        Draw.add(getGeoJSON("negativePoint"))
        Draw.add(getGeoJSON("point"))
        map.fire.mockClear()

        await afterNextRender()
        map.dragPan.disable.mockClear()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        expect(map.dragPan.disable, "dragPan is still enabled").toHaveBeenCalledTimes(0)
        map.fire("mousemove", makeMouseEvent(15, 15, { shiftKey: true }))
        map.fire("mouseup", makeMouseEvent(15, 15, { shiftKey: true }))

        const args = getFireArgs().filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have zero selectionchange events").toBe(0)
        cleanUp()
    })

    it("static - try clicking many features", async () => {
        const features = [getGeoJSON("point"), getGeoJSON("line"), getGeoJSON("square")]
        Draw.add({
            type: "FeatureCollection",
            features,
        })
        map.fire.mockClear()

        await afterNextRender()
        map.fire("mousedown", makeMouseEvent(10, 10))
        map.fire("mouseup", makeMouseEvent(10, 10))
        map.fire("mousemove", makeMouseEvent(1.5, 1.5))
        map.fire("mouseup", makeMouseEvent(1.5, 1.5))
        map.fire("mousemove", makeMouseEvent(1, 1))
        map.fire("mouseup", makeMouseEvent(1, 1))

        const args = getFireArgs().filter(arg => arg[0] === "draw.selectionchange")
        expect(args.length, "should have zero selectionchange events").toBe(0)
        cleanUp()
    })
})
