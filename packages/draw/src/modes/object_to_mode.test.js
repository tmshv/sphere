import { afterEach, beforeAll, describe, expect, it } from "vitest"
import MapboxDraw from "../index"
import createMap from "../test-utils/create_map"
import getGeoJSON from "../test-utils/get_geojson"
import waitForLoad from "../test-utils/wait_for_load"

describe("object_to_mode", () => {
    let Draw

    beforeAll(async () => {
        const map = createMap()
        Draw = new MapboxDraw()
        map.addControl(Draw)
        await waitForLoad(map)
    })

    afterEach(() => {
        Draw.changeMode("simple_select")
        Draw.deleteAll()
    })

    it("combineFeatures and uncombineFeatures do nothing in a mode without combine hooks", () => {
        Draw.changeMode("draw_point")
        expect(() => Draw.combineFeatures(), "combineFeatures in draw_point").not.toThrow()
        expect(() => Draw.uncombineFeatures(), "uncombineFeatures in draw_point").not.toThrow()
        expect(Draw.getMode(), "stays in draw_point").toBe("draw_point")
    })

    it("combineFeatures and uncombineFeatures do nothing in direct_select", () => {
        const [lineId] = Draw.add(getGeoJSON("line"))
        Draw.changeMode("direct_select", { featureId: lineId })
        expect(() => Draw.combineFeatures(), "combineFeatures in direct_select").not.toThrow()
        expect(() => Draw.uncombineFeatures(), "uncombineFeatures in direct_select").not.toThrow()
        expect(Draw.getMode(), "stays in direct_select").toBe("direct_select")
        expect(Draw.getAll().features.length, "features untouched").toBe(1)
    })
})
