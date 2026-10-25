import { beforeEach, describe, expect, test, vi } from "vitest"

const { ipc } = vi.hoisted(() => ({
    ipc: {
        selectionRectFeatures: vi.fn(),
        selectionApply: vi.fn(),
        selectionGetIds: vi.fn(),
        selectionCount: vi.fn(),
    },
}))

vi.mock("@/map", () => ({
    getMap: () => ({
        getContainer: () => ({
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        }),
        unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
    }),
}))

vi.mock("@/lib/maplibre", () => ({
    queryFeaturesInPoint: vi.fn().mockReturnValue([]),
    queryFeaturesInScreenRect: vi.fn().mockReturnValue([]),
    serializeFeaturesForIpc: vi.fn().mockReturnValue("[]"),
}))

vi.mock("@/lib/selection-bus", () => ({
    emitSelectionDelta: vi.fn(),
    emitSelectionReconcile: vi.fn(),
}))

vi.mock("@/lib/selection-ipc", () => ({
    ...ipc,
    selectionAdd: vi.fn(),
    selectionCacheFeatures: vi.fn(),
    selectionClear: vi.fn(),
    selectionRemove: vi.fn(),
    selectionSet: vi.fn(),
}))

vi.mock("../preview", () => ({
    selectPreviewLayerIds: () => [],
}))

import { makeCaptureStore, makeMvtSource, makeSourceState } from "@/testutils"
import type { Id } from "@/types"
import { actions } from "../actions"
import { rectSelectCommit } from "../rect-select"
import listener from "./rect-select-mvt"

const MVT_ID = "m1"
const ROADS_NODE_ID = `${MVT_ID}/roads`
const FOLDER_ID = "f1"
const SELECTED_COUNT = 2

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

function makeStore(selectedId: Id) {
    const mvt = makeMvtSource(MVT_ID, { sourceLayers: [{ id: "roads", name: "Roads" }] })
    return makeCaptureStore({
        preloadedState: {
            source: makeSourceState([mvt], { folderIds: [FOLDER_ID], selectedIds: [selectedId] }),
        },
        middleware: listener.middleware,
    })
}

const commit = rectSelectCommit({ start: { x: 10, y: 10 }, current: { x: 100, y: 100 }, modifier: "none" })

describe("rect-select-mvt listener", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ipc.selectionRectFeatures.mockResolvedValue({ added: [1, 2], removed: [] })
        ipc.selectionApply.mockResolvedValue({ added: [], removed: [] })
        ipc.selectionGetIds.mockResolvedValue([1, 2])
        ipc.selectionCount.mockResolvedValue(SELECTED_COUNT)
    })

    test("commits a rect selection against the selected vector MVT source", async () => {
        const { store, dispatched } = makeStore(MVT_ID)

        store.dispatch(commit)
        await flush()

        expect(dispatched).toContainEqual(actions.selection.sync({ count: SELECTED_COUNT, sourceId: MVT_ID }))
    })

    test("commits against the parent source of a selected source-layer node", async () => {
        const { store, dispatched } = makeStore(ROADS_NODE_ID)

        store.dispatch(commit)
        await flush()

        expect(ipc.selectionRectFeatures).toHaveBeenCalledTimes(1)
        expect(dispatched).toContainEqual(actions.selection.sync({ count: SELECTED_COUNT, sourceId: MVT_ID }))
    })

    test("does nothing for a selected folder", async () => {
        const { store } = makeStore(FOLDER_ID)

        store.dispatch(commit)
        await flush()

        expect(ipc.selectionRectFeatures).not.toHaveBeenCalled()
    })
})
