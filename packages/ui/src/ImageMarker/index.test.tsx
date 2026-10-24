import { fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { ImageMarker } from "."

describe("ImageMarker", () => {
    it("renders children", () => {
        render(
            <ImageMarker src="photo.jpg" size={32} layout="circle">
                <span>12</span>
            </ImageMarker>,
        )
        expect(screen.getByText("12")).toBeInTheDocument()
    })

    it("sizes the marker and uses src as background image", () => {
        render(
            <ImageMarker src="photo.jpg" size={32} layout="square">
                <span>label</span>
            </ImageMarker>,
        )
        const marker = screen.getByText("label").parentElement
        expect(marker).toHaveStyle({ width: "32px", height: "32px", backgroundImage: "url(photo.jpg)" })
    })

    it("calls onHover and onLeaveHover on mouse enter and leave", () => {
        const onHover = vi.fn()
        const onLeaveHover = vi.fn()
        render(
            <ImageMarker src="photo.jpg" size={32} layout="circle" onHover={onHover} onLeaveHover={onLeaveHover}>
                <span>label</span>
            </ImageMarker>,
        )
        const marker = screen.getByText("label").parentElement
        if (!marker) {
            throw new Error("marker not rendered")
        }
        fireEvent.mouseEnter(marker)
        expect(onHover).toHaveBeenCalledTimes(1)
        fireEvent.mouseLeave(marker)
        expect(onLeaveHover).toHaveBeenCalledTimes(1)
    })
})
