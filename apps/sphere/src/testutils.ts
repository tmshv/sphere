import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { SourceType } from "@/types"

export type CapturedAction = { type: string; payload?: unknown }

function isCapturedAction(action: unknown): action is CapturedAction {
    if (typeof action !== "object" || action === null) return false
    if (!("type" in action)) return false
    return typeof action.type === "string"
}

export type MakeCaptureStoreOptions = {
    preloadedState?: object
    middleware?: Middleware
}

/**
 * Builds a minimal Redux store around an identity reducer, wired with a
 * capture middleware that records every dispatched action verbatim. Used by
 * thunk/listener tests that need to assert on what a thunk or listener
 * dispatched without pulling in the real app reducer tree.
 *
 * - `preloadedState` seeds `getState()` for thunks that read `RootState`
 *   (the thunk under test is responsible for narrowing it to `RootState`,
 *   same as production code does at the IPC/selector boundary).
 * - `middleware` prepends a middleware under test (e.g. `listener.middleware`
 *   from a `createListenerMiddleware` instance) ahead of the capture
 *   middleware, so the capture middleware still sees every action the
 *   middleware under test dispatches or re-dispatches.
 */
export function makeCaptureStore(options: MakeCaptureStoreOptions = {}) {
    const dispatched: CapturedAction[] = []
    const captureMiddleware: Middleware = () => next => action => {
        if (isCapturedAction(action)) {
            dispatched.push(action)
        }
        return next(action)
    }
    const preloadedState = options.preloadedState ?? {}
    const middlewareUnderTest = options.middleware
    const store = configureStore({
        reducer: (s: object = preloadedState) => s,
        preloadedState,
        middleware: getDefault => {
            const base = getDefault()
            if (middlewareUnderTest) {
                return base.prepend(middlewareUnderTest).concat(captureMiddleware)
            }
            return base.concat(captureMiddleware)
        },
    })
    return { store, dispatched }
}

export function makeGeojsonSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.Geojson,
        location: `/path/to/${id}.geojson`,
        format: "geojson",
        version: 0,
        fractionIndex: 0,
        editable: false,
        pending: false,
        meta: {
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 0,
        },
        ...overrides,
    }
}

export function makeCsvSource<T extends object>(id: string, overrides: T = {} as T) {
    return makeGeojsonSource(id, { format: "csv", location: `/path/to/${id}.csv`, ...overrides })
}

export function makeMvtSource<T extends object>(id: string, overrides: T = {} as T) {
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.MVT,
        location: `/path/to/${id}.mbtiles`,
        fractionIndex: 0,
        editable: false as const,
        pending: false as const,
        format: "pbf" as const,
        tilejson: { vector_layers: [] },
        sourceLayers: [],
        ...overrides,
    }
}
