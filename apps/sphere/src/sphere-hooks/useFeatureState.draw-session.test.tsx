import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { emitSelectionReconcile } from "@/lib/selection-bus"
import { actions } from "@/store/actions"
import drawReducer from "@/store/draw"
import exitDrawOnSourceDelete from "@/store/listeners/exit-draw-on-source-delete"
import saveDraw from "@/store/listeners/save-draw"
import selectionReducer from "@/store/selection"
import sourceReducer, { sourceSlice } from "@/store/source"
import { flushAsync, makeGeojsonSource } from "@/testutils"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { act, renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import type { ReactNode } from "react"
import useFeatureState from "./useFeatureState"

const DRAWN = "drawn"
const OTHER = "other"
const SELECTED_IDS = [1, 2]

type FeatureTarget = { source: string; sourceLayer?: string; id?: number | string }

/** A map that keeps the feature-state `selected` flags the hook sets, as `source/id`. */
function makeMap() {
    const selected = new Set<string>()
    const map = {
        setFeatureState: (target: FeatureTarget) => {
            selected.add(`${target.source}/${target.id}`)
        },
        removeFeatureState: (target: FeatureTarget) => {
            for (const key of [...selected]) {
                if (
                    key.startsWith(`${target.source}/`) &&
                    (target.id === undefined || key === `${target.source}/${target.id}`)
                ) {
                    selected.delete(key)
                }
            }
        },
        getLayer: () => undefined,
    }
    // Test double of the map ref: the hook reads only these three map methods
    const ref = { getMap: () => map } as unknown as MapRef
    return { ref, highlighted: () => [...selected].sort() }
}

function setup() {
    // The listeners are typed by the full RootState, but read only the slices below
    const listeners: Middleware[] = [saveDraw.middleware, exitDrawOnSourceDelete.middleware]
    const store = configureStore({
        reducer: {
            draw: drawReducer,
            selection: selectionReducer,
            source: sourceReducer,
            layer: () => ({ items: {}, selectedId: undefined }),
        },
        preloadedState: {
            selection: { count: SELECTED_IDS.length, version: 0, sourceId: OTHER },
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(...listeners),
    })
    for (const id of [OTHER, DRAWN]) {
        const { name, location, meta } = makeGeojsonSource(id)
        store.dispatch(sourceSlice.actions.addGeojsonSource({ id, name, location, format: "geojson", meta }))
    }
    store.dispatch(sourceSlice.actions.select(OTHER))
    const { ref, highlighted } = makeMap()
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
    renderHook(() => useFeatureState(ref), { wrapper })
    // The selection of the other source is highlighted
    act(() => emitSelectionReconcile(SELECTED_IDS, OTHER))
    // A session starts on the drawn source and leaves the selection of the other source alone
    act(() => {
        store.dispatch(actions.draw.started({ sourceId: DRAWN }))
    })
    return { store, highlighted }
}

describe("useFeatureState around a draw session that never changed the selection", () => {
    beforeEach(() => {
        mockInvoke.mockImplementation((cmd: string) => {
            switch (cmd) {
                case "draw_commit":
                case "draw_rollback":
                    return Promise.resolve([])
                case "selection_get_ids":
                    return Promise.resolve(SELECTED_IDS)
                default:
                    return Promise.reject(`unexpected command ${cmd}`)
            }
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    test("a selection on another source is not highlighted while drawing", () => {
        const { highlighted } = setup()
        expect(highlighted()).toEqual([])
    })

    test("Done highlights the selection of the other source again", async () => {
        const { store, highlighted } = setup()

        await act(async () => {
            store.dispatch(actions.draw.commit({ sourceId: DRAWN }))
            await flushAsync()
        })

        expect(store.getState().draw.sourceId).toBeUndefined()
        expect(highlighted()).toEqual([`${OTHER}/1`, `${OTHER}/2`])
    })

    test("Cancel highlights the selection of the other source again", async () => {
        const { store, highlighted } = setup()

        await act(async () => {
            store.dispatch(actions.draw.cancel({ sourceId: DRAWN }))
            await flushAsync()
        })

        expect(store.getState().draw.sourceId).toBeUndefined()
        expect(highlighted()).toEqual([`${OTHER}/1`, `${OTHER}/2`])
    })

    test("removing the drawn source highlights the selection of the other source again", async () => {
        const { store, highlighted } = setup()

        await act(async () => {
            store.dispatch(actions.source.removeSource(DRAWN))
            await flushAsync()
        })

        expect(store.getState().draw.sourceId).toBeUndefined()
        expect(highlighted()).toEqual([`${OTHER}/1`, `${OTHER}/2`])
    })

    test("a reconcile that lands before React rendered the session's end still highlights", () => {
        const { store, highlighted } = setup()

        // The IPC answer may beat React's render of the store change: both happen in one act here
        act(() => {
            store.dispatch(actions.draw.done({ sourceId: DRAWN }))
            emitSelectionReconcile(SELECTED_IDS, OTHER)
        })

        expect(highlighted()).toEqual([`${OTHER}/1`, `${OTHER}/2`])
    })
})
