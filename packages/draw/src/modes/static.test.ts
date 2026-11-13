import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import MapLibreDraw from "../index"
import setupAfterNextRender from "../test-utils/after_next_render"
import createMap from "../test-utils/create_map"
import getGeoJSON from "../test-utils/get_geojson"
import makeMouseEvent from "../test-utils/make_mouse_event"
import waitForLoad from "../test-utils/wait_for_load"
import type { RenderPush } from "../lib/mode_handler"
import type { DrawRenderFeature } from "../types"
import Mode, { type ModeContext } from "./mode"

// A custom mode like @mapbox/mapbox-gl-draw-static-mode: shows the features and handles no events
class StaticMode extends Mode {
    constructor(ctx: ModeContext) {
        super(ctx)
        this.setActionableState()
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void {
        display(geojson)
    }
}

describe("static", () => {
    const map = createMap()
    const Draw = new MapLibreDraw({
        modes: {
            static: StaticMode,
        },
        defaultMode: "static",
    })
    map.addControl(Draw)

    const fireSpy = vi.spyOn(map, "fire")
    map.dragPan.disable()
    const dragPanDisableSpy = vi.spyOn(map.dragPan, "disable")

    const afterNextRender = setupAfterNextRender(map)
    // The map fires `load` on the next tick, so listen for it right away
    const loaded = waitForLoad(map)

    function cleanUp() {
        Draw.deleteAll()
        fireSpy.mockClear()
    }

    function getFireArgs() {
        return [...fireSpy.mock.calls]
    }

    beforeAll(async () => {
        await loaded
    })

    afterAll(() => {
        vi.restoreAllMocks()
    })

    it("static - box select", async () => {
        Draw.add(getGeoJSON("negativePoint"))
        Draw.add(getGeoJSON("point"))
        fireSpy.mockClear()

        await afterNextRender()
        dragPanDisableSpy.mockClear()
        map.fire("mousedown", makeMouseEvent(0, 0, { shiftKey: true }))
        expect(dragPanDisableSpy, "dragPan is still enabled").toHaveBeenCalledTimes(0)
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
        fireSpy.mockClear()

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
