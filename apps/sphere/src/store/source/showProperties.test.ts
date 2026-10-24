import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockEmit } = vi.hoisted(() => ({ mockEmit: vi.fn() }))

vi.mock("@tauri-apps/api/event", () => ({ emit: mockEmit }))
vi.mock("@tauri-apps/api/webviewWindow", () => ({
    WebviewWindow: { getByLabel: vi.fn().mockResolvedValue({ setFocus: vi.fn().mockResolvedValue(undefined) }) },
}))
vi.mock("@/lib/tauri", () => ({ waitEvent: vi.fn().mockResolvedValue("ready") }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { makeCaptureStore, makeGeojsonSource, makeSourceState } from "@/testutils"
import type { Id } from "@/types"
import { showProperties } from "./showProperties"

const SOURCE_ID = "s1"
const FOLDER_ID = "f1"
const SELECTED_COUNT = 3

function makeStore(selectedId: Id, selectionSourceId?: Id) {
    return makeCaptureStore({
        preloadedState: {
            source: makeSourceState([makeGeojsonSource(SOURCE_ID)], {
                folderIds: [FOLDER_ID],
                selectedIds: [selectedId],
            }),
            selection: { count: SELECTED_COUNT, version: 0, sourceId: selectionSourceId },
        },
    })
}

function selectionChangedCalls() {
    return mockEmit.mock.calls.filter(call => call.at(0) === "properties-selection-changed")
}

describe("showProperties", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("reports the feature selection of the selected source", async () => {
        const { store } = makeStore(SOURCE_ID)

        await store.dispatch(showProperties({ id: SOURCE_ID }))

        expect(selectionChangedCalls()).toEqual([
            ["properties-selection-changed", { sourceId: SOURCE_ID, count: SELECTED_COUNT }],
        ])
    })

    test("does not report a selection when the selected node resolves to no source", async () => {
        const { store } = makeStore(FOLDER_ID)

        await store.dispatch(showProperties({ id: SOURCE_ID }))

        expect(mockEmit).toHaveBeenCalledWith("properties-set", expect.objectContaining({ sourceId: SOURCE_ID }))
        expect(selectionChangedCalls()).toEqual([])
    })
})
