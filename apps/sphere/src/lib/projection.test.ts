import { describe, expect, test } from "vitest"
import { WEB_MERCATOR_CRS, projectionCrs } from "./projection"

describe("projectionCrs", () => {
    test("mercator renders in Web Mercator", () => {
        expect(projectionCrs("mercator")).toBe(WEB_MERCATOR_CRS)
    })

    test("globe takes Web Mercator tiles", () => {
        expect(projectionCrs("globe")).toBe(WEB_MERCATOR_CRS)
    })

    test("Web Mercator is EPSG:3857", () => {
        expect(WEB_MERCATOR_CRS).toBe("EPSG:3857")
    })
})
