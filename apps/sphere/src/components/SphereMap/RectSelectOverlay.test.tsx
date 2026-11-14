import { afterEach, describe, expect, test, vi } from "vitest"

const { mockIsOver } = vi.hoisted(() => ({ mockIsOver: vi.fn() }))
vi.mock("@/lib/draw-hit", () => ({ isOverDrawFeature: mockIsOver }))

import appReducer, { actions as appActions } from "@/store/app"
import drawReducer from "@/store/draw"
import sourceReducer from "@/store/source"
import { actions } from "@/store/actions"
import { type Middleware, type UnknownAction, configureStore } from "@reduxjs/toolkit"
import { act, cleanup, render } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import RectSelectOverlay from "./RectSelectOverlay"

function setup(drawSourceId: string | undefined) {
    const seen: UnknownAction[] = []
    const recorder: Middleware = () => next => action => {
        seen.push(action as UnknownAction)
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer, draw: drawReducer, source: sourceReducer },
        middleware: gDM => gDM().concat(recorder),
        preloadedState: {
            draw: { sourceId: drawSourceId, pending: false, hiddenIds: [] },
        },
    })
    store.dispatch(appActions.setMapTool("select"))
    seen.length = 0

    const container = document.createElement("div")
    document.body.appendChild(container)
    const map = { getCanvasContainer: () => container }
    const mapRef = { getMap: () => map } as unknown as MapRef // test double of the map ref
    render(
        <Provider store={store}>
            <RectSelectOverlay mapRef={mapRef} />
        </Provider>,
    )
    return { seen, container }
}

function mouse(target: EventTarget, type: string, x: number, y: number) {
    act(() => {
        target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }))
    })
}

const has = (seen: UnknownAction[], type: string) => seen.some(a => a.type === type)

describe("RectSelectOverlay while drawing", () => {
    afterEach(() => {
        cleanup()
        mockIsOver.mockReset()
    })

    test("a mousedown on a draw feature starts no rectangle", () => {
        mockIsOver.mockReturnValue(true)
        const { seen, container } = setup("s1")
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.drag.type)).toBe(false)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(false)
    })

    test("a drag on empty map drags and commits a rectangle", () => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup("s1")
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.drag.type)).toBe(true)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(true)
    })

    test("a click without a drag dispatches no rectSelect.click", () => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup("s1")
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mouseup", 5, 5)
        expect(has(seen, actions.rectSelect.click.type)).toBe(false)
    })
})
