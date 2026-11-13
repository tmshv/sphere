import { describe, expect, it } from "vitest"
import createVertex from "../src/lib/create_vertex"

describe("createVertex", () => {
    it("creates vertex features", () => {
        expect(createVertex("foo", [1, 2], "3.4.5", true)).toEqual({
            type: "Feature",
            properties: {
                meta: "vertex",
                parent: "foo",
                coord_path: "3.4.5",
                active: "true",
            },
            geometry: {
                type: "Point",
                coordinates: [1, 2],
            },
        })

        expect(createVertex("bar", [99, 199], "1", false)).toEqual({
            type: "Feature",
            properties: {
                meta: "vertex",
                parent: "bar",
                coord_path: "1",
                active: "false",
            },
            geometry: {
                type: "Point",
                coordinates: [99, 199],
            },
        })
    })
})
