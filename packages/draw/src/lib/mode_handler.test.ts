import { describe, expect, it, vi } from "vitest"
import type { DrawModeEventMap, DrawModeEventName } from "../types"
import { enterEvent } from "../test-utils/key_events"
import makeMouseEvent from "../test-utils/make_mouse_event"
import makeTouchEvent from "../test-utils/make_touch_event"
import required from "../test-utils/required"
import createMockMode from "../test-utils/create_mock_mode"
import createMockModeHandlerContext from "../test-utils/create_mock_mode_handler_context"
import modeHandler, { type ModeHandle, type ModeLifecycle } from "./mode_handler"

/** One delegated event: registers a handler for it, dispatches an event and checks the handler got it. */
interface DelegatedEvent {
    name: DrawModeEventName
    check(lifecycle: ModeLifecycle, mh: ModeHandle): void
}

function delegated<K extends DrawModeEventName>(
    name: K,
    event: DrawModeEventMap[K],
    dispatch: (mh: ModeHandle, event: DrawModeEventMap[K]) => void,
): DelegatedEvent {
    return {
        name,
        check(lifecycle, mh) {
            const eventSpy = vi.fn()
            lifecycle.on(name, () => true, eventSpy)
            dispatch(mh, event)
            expect(eventSpy, `${name} callback called via delegation`).toHaveBeenCalledTimes(1)
            expect(eventSpy, "with correct argument").toHaveBeenNthCalledWith(1, event)
        },
    }
}

const DELEGATED_EVENTS: DelegatedEvent[] = [
    delegated("drag", makeMouseEvent(2, 2), (mh, e) => mh.drag(e)),
    delegated("click", makeMouseEvent(2, 2), (mh, e) => mh.click(e)),
    delegated("mousemove", makeMouseEvent(2, 2), (mh, e) => mh.mousemove(e)),
    delegated("mouseup", makeMouseEvent(2, 2), (mh, e) => mh.mouseup(e)),
    delegated("mouseout", new MouseEvent("mouseout"), (mh, e) => mh.mouseout(e)),
    delegated("keydown", enterEvent(), (mh, e) => mh.keydown(e)),
    delegated("keyup", enterEvent(), (mh, e) => mh.keyup(e)),
    delegated("touchstart", makeTouchEvent(2, 2), (mh, e) => mh.touchstart(e)),
    delegated("touchmove", makeTouchEvent(2, 2), (mh, e) => mh.touchmove(e)),
    delegated("touchend", makeTouchEvent(2, 2), (mh, e) => mh.touchend(e)),
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
        const captured: { context?: ModeLifecycle } = {}
        function handleStart(this: ModeLifecycle) {
            captured.context = this
        }
        const handleStartSpy = vi.fn(handleStart)
        const mode = { ...createMockMode(), start: handleStartSpy }
        const drawContext = createMockModeHandlerContext()

        const mh = modeHandler(mode, drawContext)
        const startContext = required(captured.context, "mode.start was not called with a context")
        expect(handleStartSpy, "start was called on mode handler creation").toHaveBeenCalledTimes(1)
        expect(typeof startContext.on, "start context has on()").toBe("function")
        expect(typeof startContext.render, "start context has render()").toBe("function")
        expect(Object.keys(startContext).length, "start context has no unexpected properties").toBe(2)

        startContext.render("foo")
        expect(
            drawContext.store.featureChanged,
            "start context render calls store.featureChanged",
        ).toHaveBeenCalledWith("foo")

        expect(() => {
            // "bar" is not an event type on purpose, which the typed `on` would not allow
            Reflect.apply(startContext.on, startContext, ["bar", () => true, () => {}])
        }, "start context on throws on unknown event type").toThrow()

        mh.mousedown(makeMouseEvent(1, 1))
        expect(drawContext.store.render, "render not called if no handler fires").toHaveBeenCalledTimes(0)
        expect(
            drawContext.ui.updateMapClasses,
            "updateMapClasses not called if no handler fires",
        ).toHaveBeenCalledTimes(0)

        const mousedownSpy = vi.fn()
        const secondEvent = makeMouseEvent(2, 2)
        startContext.on("mousedown", () => true, mousedownSpy)
        mh.mousedown(secondEvent)
        expect(mousedownSpy, "mousedown callback called via delegation").toHaveBeenCalledTimes(1)
        expect(mousedownSpy, "with correct argument").toHaveBeenNthCalledWith(1, secondEvent)
        expect(drawContext.store.render, "render called if handler fires").toHaveBeenCalledTimes(1)
        expect(drawContext.ui.updateMapClasses, "updateMapClasses called if handler fires").toHaveBeenCalledTimes(1)

        const mousedownFailSpy = vi.fn()
        const thirdEvent = makeMouseEvent(3, 3)
        mousedownSpy.mockClear()
        startContext.on("mousedown", e => e.point.x !== thirdEvent.point.x, mousedownFailSpy)
        mh.mousedown(thirdEvent)
        expect(mousedownFailSpy, "delegation only calls callbacks with selectors returning true").toHaveBeenCalledTimes(
            0,
        )
        expect(mousedownSpy).toHaveBeenCalledTimes(1)
        expect(mousedownSpy).toHaveBeenNthCalledWith(1, thirdEvent)

        for (const delegatedEvent of DELEGATED_EVENTS) {
            delegatedEvent.check(startContext, mh)
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
