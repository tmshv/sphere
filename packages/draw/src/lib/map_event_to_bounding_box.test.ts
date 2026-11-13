import { describe, expect, it } from "vitest"
import mapEventToBoundingBox from "./map_event_to_bounding_box"

describe("mapEventToBoundingBox", () => {
    it("builds a bounding box around the event point", () => {
        expect(
            mapEventToBoundingBox({
                point: {
                    x: 1,
                    y: 2,
                },
            }),
        ).toEqual([
            [1, 2],
            [1, 2],
        ])

        expect(
            mapEventToBoundingBox(
                {
                    point: {
                        x: 1,
                        y: 2,
                    },
                },
                1,
            ),
        ).toEqual([
            [0, 1],
            [2, 3],
        ])

        expect(
            mapEventToBoundingBox(
                {
                    point: {
                        x: 10.3,
                        y: 95674.234,
                    },
                },
                50.5,
            ),
        ).toEqual([
            [-40.2, 95623.734],
            [60.8, 95724.734],
        ])
    })
})
