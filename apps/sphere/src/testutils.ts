import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { createSourceNodes } from "@/lib/source-tree"
import { type Id, type SourceNode, type SourceTreeInput, SourceType } from "@/types"

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
        editable: false as const,
        pending: false as const,
        format: "pbf" as const,
        tilejson: { vector_layers: [] },
        sourceLayers: [],
        ...overrides,
    }
}

export type MakeSourceStateOptions = {
    selectedIds?: Id[]
    // Empty root folders, placed after the source roots
    folderIds?: Id[]
    // Nodes built with `visible: false`
    hiddenIds?: Id[]
}

function makeFolderNode(id: Id): SourceNode {
    return { id, name: `Folder ${id}`, kind: "folder", visible: true, children: [] }
}

/**
 * Builds a `source` slice state from a list of source fixtures (e.g. from
 * `makeGeojsonSource` / `makeMvtSource`). Items are stored verbatim; root nodes
 * follow the given order and nodes come from the same `createSourceNodes` the
 * reducer uses, so vector MVT fixtures get expanded `source-layer` children.
 */
export function makeSourceState<T extends SourceTreeInput>(sources: T[], options: MakeSourceStateOptions = {}) {
    const built = sources.map(source => createSourceNodes(source))
    const folders = (options.folderIds ?? []).map(makeFolderNode)
    const hidden = new Set(options.hiddenIds ?? [])
    const nodeList = [...built.flatMap(({ root, children }) => [root, ...children]), ...folders].map(node =>
        hidden.has(node.id) ? { ...node, visible: false } : node,
    )
    const ids = sources.map(source => source.id)
    return {
        items: Object.fromEntries(sources.map(source => [source.id, source])),
        allIds: ids,
        nodes: Object.fromEntries(nodeList.map(node => [node.id, node])),
        rootIds: [...ids, ...folders.map(folder => folder.id)],
        expandedIds: built.filter(({ children }) => children.length > 0).map(({ root }) => root.id),
        selectedIds: options.selectedIds ?? [],
    }
}
