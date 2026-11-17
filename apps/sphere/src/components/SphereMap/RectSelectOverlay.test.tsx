import { afterEach, describe, expect, test, vi } from "vitest"

const { mockIsOver } = vi.hoisted(() => ({ mockIsOver: vi.fn() }))
vi.mock("@/lib/draw-hit", () => ({ isOverDrawFeature: mockIsOver }))

import appReducer, { actions as appActions } from "@/store/app"
import drawReducer from "@/store/draw"
import sourceReducer, { sourceSlice } from "@/store/source"
import { actions } from "@/store/actions"
import { type Middleware, type UnknownAction, configureStore } from "@reduxjs/toolkit"
import { makeGeojsonSource } from "@/testutils"
import { act, cleanup, render } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import RectSelectOverlay from "./RectSelectOverlay"

function isAction(value: unknown): value is UnknownAction {
    return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
}

const SOURCE_ID = "s1"

function setup(drawSourceId: string | undefined, drawMode?: string) {
    const seen: UnknownAction[] = []
    const recorder: Middleware = () => next => action => {
        if (isAction(action)) {
            seen.push(action)
        }
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer, draw: drawReducer, source: sourceReducer },
        middleware: gDM => gDM().concat(recorder),
        preloadedState: {
            draw: {
                sourceId: drawSourceId,
                pending: false,
                hiddenIds: [],
                mode: drawMode,
                actionable: { trash: false, combineFeatures: false, uncombineFeatures: false },
            },
        },
    })
    // Outside draw, selection acts on the source selected in the tree
    const { name, location, meta } = makeGeojsonSource(SOURCE_ID)
    store.dispatch(sourceSlice.actions.addGeojsonSource({ id: SOURCE_ID, name, location, format: "geojson", meta }))
    store.dispatch(sourceSlice.actions.select(SOURCE_ID))
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
        const { seen, container } = setup(SOURCE_ID)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.drag.type)).toBe(false)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(false)
    })

    test("a drag on empty map drags and commits a rectangle", () => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup(SOURCE_ID)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.drag.type)).toBe(true)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(true)
    })

    test("a click without a drag dispatches no rectSelect.click", () => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup(SOURCE_ID)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mouseup", 5, 5)
        expect(has(seen, actions.rectSelect.click.type)).toBe(false)
    })
})

describe("RectSelectOverlay while draw creates a feature", () => {
    afterEach(() => {
        cleanup()
        mockIsOver.mockReset()
    })

    test.each([
        "draw_point",
        "draw_line_string",
        "draw_polygon",
    ])("a drag between the clicks of %s starts no rectangle", mode => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup(SOURCE_ID, mode)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.drag.type)).toBe(false)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(false)
    })

    test("back in simple_select a drag on empty map draws a rectangle again", () => {
        mockIsOver.mockReturnValue(false)
        const { seen, container } = setup(SOURCE_ID, "simple_select")
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(true)
    })
})

describe("RectSelectOverlay outside draw", () => {
    afterEach(() => {
        cleanup()
        mockIsOver.mockReset()
    })

    test("a click without a drag dispatches rectSelect.click", () => {
        const { seen, container } = setup(undefined)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mouseup", 5, 5)
        expect(has(seen, actions.rectSelect.click.type)).toBe(true)
    })

    test("the draw hit-test neither runs nor blocks a rectangle", () => {
        mockIsOver.mockReturnValue(true)
        const { seen, container } = setup(undefined)
        mouse(container, "mousedown", 5, 5)
        mouse(window, "mousemove", 50, 50)
        mouse(window, "mouseup", 50, 50)
        expect(mockIsOver).not.toHaveBeenCalled()
        expect(has(seen, actions.rectSelect.drag.type)).toBe(true)
        expect(has(seen, actions.rectSelect.commit.type)).toBe(true)
    })
})
