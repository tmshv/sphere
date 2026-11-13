import { describe, expect, it } from "vitest"
import isEventAtCoordinates from "../src/lib/is_event_at_coordinates"

describe("isEventAtCoordinates", () => {
    it("compares event position to coordinates", () => {
        expect(
            isEventAtCoordinates(
                {
                    lngLat: {
                        lng: 3,
                        lat: 29,
                    },
                },
                [3, 29],
            ),
        ).toBeTruthy()
        expect(
            isEventAtCoordinates(
                {
                    lngLat: {
                        lng: -3,
                        lat: 29,
                    },
                },
                [3, 29],
            ),
        ).toBeFalsy()
        expect(
            isEventAtCoordinates(
                {
                    nothing: true,
                },
                [3, 29],
            ),
        ).toBeFalsy()
    })
})
