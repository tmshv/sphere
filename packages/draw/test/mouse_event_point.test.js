import Point from "@mapbox/point-geometry"
import { describe, expect, it } from "vitest"
import mouseEventPoint from "../src/lib/mouse_event_point"

describe("mouseEventPoint", () => {
    it("converts a mouse event to a point relative to the container", () => {
        const mockContainer = {
            clientLeft: 2,
            clientTop: 1,
            getBoundingClientRect() {
                return {
                    left: 10,
                    top: 20,
                }
            },
        }

        const mockEvent = {
            clientX: 15,
            clientY: 33,
        }

        const result = mouseEventPoint(mockEvent, mockContainer)
        expect(result instanceof Point).toBe(true)
        expect(result.x).toBe(3)
        expect(result.y).toBe(12)
    })
})
