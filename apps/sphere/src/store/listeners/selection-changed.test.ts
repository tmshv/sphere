import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockEmit, mockQueryPage } = vi.hoisted(() => ({
    mockEmit: vi.fn(),
    mockQueryPage: vi.fn(),
}))

vi.mock("@tauri-apps/api/event", () => ({ emit: mockEmit }))
vi.mock("@tauri-apps/api/webviewWindow", () => ({
    WebviewWindow: { getByLabel: vi.fn().mockResolvedValue(null) },
}))
vi.mock("@/lib/selection-ipc", () => ({ selectionQueryPage: mockQueryPage }))

import { makeCaptureStore, makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import type { Id } from "@/types"
import { actions } from "../actions"
import listener from "./selection-changed"

const MVT_ID = "m1"
const ROADS_NODE_ID = `${MVT_ID}/roads`
const SOURCE_ID = "s1"
const FOLDER_ID = "f1"

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

function makeStore(selectedId: Id, count = 0) {
    const mvt = makeMvtSource(MVT_ID, { sourceLayers: [{ id: "roads", name: "Roads" }] })
    return makeCaptureStore({
        preloadedState: {
            source: makeSourceState([makeGeojsonSource(SOURCE_ID), mvt], {
                folderIds: [FOLDER_ID],
                selectedIds: [selectedId],
            }),
            layer: { items: {}, allIds: [] },
            selection: { count, version: 0 },
        },
        middleware: listener.middleware,
    })
}

describe("selection-changed listener", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockQueryPage.mockResolvedValue({ features: [], total: 0 })
    })

    test("falls back to the selected source when the selection has no source", async () => {
        const { store, dispatched } = makeStore(SOURCE_ID)

        store.dispatch(actions.selection.apply())
        await flush()

        expect(dispatched).toContainEqual(actions.selection.setSourceId(SOURCE_ID))
    })

    test("falls back to the parent source of a selected source-layer node", async () => {
        const { store, dispatched } = makeStore(ROADS_NODE_ID)

        store.dispatch(actions.selection.apply())
        await flush()

        expect(dispatched).toContainEqual(actions.selection.setSourceId(MVT_ID))
    })

    test("has no source for a selected folder", async () => {
        const { store, dispatched } = makeStore(FOLDER_ID)

        store.dispatch(actions.selection.apply())
        await flush()

        expect(dispatched.some(action => action.type === actions.selection.setSourceId.type)).toBe(false)
        expect(dispatched).toContainEqual(actions.properties.reset())
    })
})
