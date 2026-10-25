import { act, render, screen } from "../test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useElementSize } from "./useElementSize"

const MEASURED = { width: 120, height: 80 }
const RESIZED = { width: 200, height: 150 }

function Probe() {
    const { ref, width, height } = useElementSize<HTMLDivElement>()
    return <div ref={ref}>{`${width}x${height}`}</div>
}

class FakeResizeObserver implements ResizeObserver {
    static last: FakeResizeObserver | undefined
    callback: ResizeObserverCallback
    disconnect = vi.fn()
    observe = vi.fn()
    unobserve = vi.fn()

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        FakeResizeObserver.last = this
    }

    resize(width: number, height: number) {
        const entry: ResizeObserverEntry = {
            target: document.body,
            contentRect: new DOMRect(0, 0, width, height),
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
        }
        this.callback([entry], this)
    }
}

describe("useElementSize", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        FakeResizeObserver.last = undefined
    })

    it("measures the element once when ResizeObserver is absent", () => {
        vi.stubGlobal("ResizeObserver", undefined)
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
            new DOMRect(0, 0, MEASURED.width, MEASURED.height),
        )
        render(<Probe />)
        expect(screen.getByText(`${MEASURED.width}x${MEASURED.height}`)).toBeInTheDocument()
    })

    it("follows resize events and disconnects on unmount", () => {
        vi.stubGlobal("ResizeObserver", FakeResizeObserver)
        const { unmount } = render(<Probe />)
        const observer = FakeResizeObserver.last
        expect(observer?.observe).toHaveBeenCalledTimes(1)
        act(() => observer?.resize(RESIZED.width, RESIZED.height))
        expect(screen.getByText(`${RESIZED.width}x${RESIZED.height}`)).toBeInTheDocument()
        unmount()
        expect(observer?.disconnect).toHaveBeenCalledTimes(1)
    })
})
