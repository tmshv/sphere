import { SourceType } from "@/types"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const mockGetBounds = vi.fn().mockResolvedValue(null)

vi.mock("@/lib/source-reader", () => ({
    // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function() for `new` to work
    SourceReader: vi.fn().mockImplementation(function () {
        return { getBounds: mockGetBounds }
    }),
}))

vi.mock("@/lib/mbtiles", () => ({
    MbtilesReader: vi.fn().mockImplementation(() => ({
        getTileJson: vi.fn().mockResolvedValue(null),
    })),
}))

vi.mock("@/map", () => ({
    getMap: vi.fn().mockReturnValue({}),
}))

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            source: {
                zoomTo: makeAction("source/zoomTo"),
            },
            map: {
                fitBounds: (payload: unknown) => ({ type: "map/fitBounds", payload }),
            },
        },
    }
})

import listener from "./zoom-to"

function hasType(action: unknown, type: string): action is { type: string; payload: unknown } {
    return (
        typeof action === "object" && action !== null && "type" in action && (action as { type: string }).type === type
    )
}

const fcSourceState = (sourceId: string) => ({
    source: {
        items: {
            [sourceId]: {
                id: sourceId,
                type: SourceType.FeatureCollection,
                name: "test",
                location: "sphere://fc-source",
                version: 0,
                editable: true,
                fractionIndex: 0,
                pending: false,
                meta: { columns: {}, pointsCount: 1, linesCount: 0, polygonsCount: 0 },
            },
        },
    },
})

function makeStore(state: Record<string, unknown> = {}) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                .concat(captureMiddleware as unknown as Middleware),
    })
    return { store, dispatchedActions }
}

describe("zoom-to listener: FeatureCollection source", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        mockGetBounds.mockResolvedValue(null)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("dispatches fitBounds when SourceReader returns bounds", async () => {
        const bounds: [number, number, number, number] = [-10, -20, 10, 20]
        mockGetBounds.mockResolvedValue(bounds)

        const sourceId = "fc-source"
        const { store, dispatchedActions } = makeStore(fcSourceState(sourceId))

        store.dispatch({ type: "source/zoomTo", payload: sourceId })
        await vi.runAllTimersAsync()

        const fitBoundsAction = dispatchedActions.find(a => hasType(a, "map/fitBounds"))
        expect(fitBoundsAction).toBeDefined()
        expect((fitBoundsAction as { payload: unknown }).payload).toEqual(expect.objectContaining({ bounds }))
    })

    test("does not dispatch fitBounds when SourceReader returns null", async () => {
        mockGetBounds.mockResolvedValue(null)

        const sourceId = "fc-source"
        const { store, dispatchedActions } = makeStore(fcSourceState(sourceId))

        store.dispatch({ type: "source/zoomTo", payload: sourceId })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => hasType(a, "map/fitBounds"))).toBeUndefined()
    })

    test("does nothing when source does not exist", async () => {
        const { store, dispatchedActions } = makeStore({ source: { items: {} } })

        store.dispatch({ type: "source/zoomTo", payload: "nonexistent" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => hasType(a, "map/fitBounds"))).toBeUndefined()
        expect(mockGetBounds).not.toHaveBeenCalled()
    })
})
