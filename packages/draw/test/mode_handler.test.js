import { describe, expect, it, vi } from "vitest"
import modeHandler from "../src/lib/mode_handler"
import createMockMode from "./utils/create_mock_mode"
import createMockModeHandlerContext from "./utils/create_mock_mode_handler_context"

const DELEGATED_EVENTS = [
    "drag",
    "click",
    "mousemove",
    "mouseup",
    "mouseout",
    "keydown",
    "keyup",
    "touchstart",
    "touchmove",
    "touchend",
]

describe("mode_handler", () => {
    it("returned API", () => {
        const mh = modeHandler(createMockMode(), createMockModeHandlerContext())
        expect(typeof mh.render, "exposes render").toBe("function")
        expect(typeof mh.stop, "exposes stop").toBe("function")
        expect(typeof mh.trash, "exposes trash").toBe("function")
        expect(typeof mh.drag, "exposes drag").toBe("function")
        expect(typeof mh.click, "exposes click").toBe("function")
        expect(typeof mh.mousemove, "exposes mousemove").toBe("function")
        expect(typeof mh.mousedown, "exposes mousedown").toBe("function")
        expect(typeof mh.mouseup, "exposes mouseup").toBe("function")
        expect(typeof mh.mouseout, "exposes mouseout").toBe("function")
        expect(typeof mh.keydown, "exposes keydown").toBe("function")
        expect(typeof mh.keyup, "exposes keyup").toBe("function")
        expect(typeof mh.touchstart, "exposes touchstart").toBe("function")
        expect(typeof mh.touchmove, "exposes touchmove").toBe("function")
        expect(typeof mh.touchend, "exposes touchend").toBe("function")
        expect(typeof mh.tap, "exposes tap").toBe("function")
        expect(typeof mh.combineFeatures, "exposes combineFeatures").toBe("function")
        expect(typeof mh.uncombineFeatures, "exposes uncombineFeatures").toBe("function")
        expect(Object.keys(mh).length, "no unexpected properties").toBe(17)
    })

    it("ModeHandler calling mode.start with context, and delegation functionality", () => {
        let startContext
        function handleStart() {
            startContext = this
        }
        const handleStartSpy = vi.fn(handleStart)
        const mode = { ...createMockMode(), start: handleStartSpy }
        const drawContext = createMockModeHandlerContext()

        const mh = modeHandler(mode, drawContext)
        expect(handleStartSpy, "start was called on mode handler creation").toHaveBeenCalledTimes(1)
        expect(typeof startContext.on, "start context has on()").toBe("function")
        expect(typeof startContext.render, "start context has render()").toBe("function")
        expect(Object.keys(startContext).length, "start context has no unexpected properties").toBe(2)

        startContext.render("foo")
        expect(drawContext.store.featureChanged, "start context render calls store.featureChanged").toHaveBeenCalledWith(
            "foo",
        )

        expect(() => {
            startContext.on("bar", () => true, () => {})
        }, "start context on throws on unknown event type").toThrow()

        mh.mousedown({ one: 1 })
        expect(drawContext.store.render, "render not called if no handler fires").toHaveBeenCalledTimes(0)
        expect(drawContext.ui.updateMapClasses, "updateMapClasses not called if no handler fires").toHaveBeenCalledTimes(0)

        const mousedownSpy = vi.fn()
        startContext.on("mousedown", () => true, mousedownSpy)
        mh.mousedown({ two: 2 })
        expect(mousedownSpy, "mousedown callback called via delegation").toHaveBeenCalledTimes(1)
        expect(mousedownSpy, "with correct argument").toHaveBeenNthCalledWith(1, { two: 2 })
        expect(drawContext.store.render, "render called if handler fires").toHaveBeenCalledTimes(1)
        expect(drawContext.ui.updateMapClasses, "updateMapClasses called if handler fires").toHaveBeenCalledTimes(1)

        const mousedownFailSpy = vi.fn()
        mousedownSpy.mockClear()
        startContext.on("mousedown", e => !e.three, mousedownFailSpy)
        mh.mousedown({ three: 3 })
        expect(mousedownFailSpy, "delegation only calls callbacks with selectors returning true").toHaveBeenCalledTimes(0)
        expect(mousedownSpy).toHaveBeenCalledTimes(1)
        expect(mousedownSpy).toHaveBeenNthCalledWith(1, { three: 3 })

        for (const name of DELEGATED_EVENTS) {
            const eventSpy = vi.fn()
            startContext.on(name, () => true, eventSpy)
            mh[name]({ two: 2 })
            expect(eventSpy, `${name} callback called via delegation`).toHaveBeenCalledTimes(1)
            expect(eventSpy, "with correct argument").toHaveBeenNthCalledWith(1, { two: 2 })
        }
    })

    it("ModeHandler#stop calling mode.stop", () => {
        const mode = createMockMode()
        const mh = modeHandler(mode, createMockModeHandlerContext())

        mh.stop()
        expect(mode.stop, "mode.stop called").toHaveBeenCalledTimes(1)
    })

    it("ModeHandler#stop not calling nonexistent mode.stop", () => {
        const mode = createMockMode()
        delete mode.stop
        const mh = modeHandler(mode, createMockModeHandlerContext())

        expect(() => {
            mh.stop()
        }).not.toThrow()
    })

    it("Modehandler#trash", () => {
        const mode = createMockMode()
        const drawContext = createMockModeHandlerContext()
        const mh = modeHandler(mode, drawContext)

        mh.trash()
        expect(mode.trash, "mode.trash called").toHaveBeenCalledTimes(1)
        expect(drawContext.store.render, "store.render called").toHaveBeenCalledTimes(1)
    })

    it("Modehandler#trash without a mode.trash", () => {
        const mode = createMockMode()
        delete mode.trash
        const drawContext = createMockModeHandlerContext()
        const mh = modeHandler(mode, drawContext)

        expect(() => {
            mh.trash()
        }).not.toThrow()
        expect(drawContext.store.render, "store.render not called").toHaveBeenCalledTimes(0)
    })
})
