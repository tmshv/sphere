import { describe, expect, it } from "vitest"
import mouseEventPoint from "./mouse_event_point"

describe("mouseEventPoint", () => {
    it("converts a mouse event to a point relative to the container", () => {
        const mockContainer = document.createElement("div")
        Object.defineProperty(mockContainer, "clientLeft", { value: 2 })
        Object.defineProperty(mockContainer, "clientTop", { value: 1 })
        mockContainer.getBoundingClientRect = () => new DOMRect(10, 20)

        const mockEvent = {
            clientX: 15,
            clientY: 33,
        }

        const result = mouseEventPoint(mockEvent, mockContainer)
        expect(result).toEqual({ x: 3, y: 12 })
    })
})
