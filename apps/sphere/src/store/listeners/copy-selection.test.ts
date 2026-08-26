import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test, vi } from "vitest"

const copySelectionAsGeojson = vi.fn().mockResolvedValue(undefined)
const copySelectionAsWkt = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/copy-selection", () => ({
    copySelectionAsGeojson: (...args: unknown[]) => copySelectionAsGeojson(...args),
    copySelectionAsWkt: (...args: unknown[]) => copySelectionAsWkt(...args),
}))

import error from "../error"
import selection, { copySelection, selectionSlice } from "../selection"
import settings, { settingsSlice } from "../settings"
import copySelectionListener from "./copy-selection"

const SOURCE_ID = "source-1"

function makeStore() {
    return configureStore({
        reducer: { selection, settings, error },
        middleware: gDM => gDM().prepend(copySelectionListener.middleware),
    })
}

async function flush() {
    await new Promise(resolve => setTimeout(resolve, 0))
}

describe("copy-selection listener", () => {
    let store: ReturnType<typeof makeStore>

    beforeEach(() => {
        vi.clearAllMocks()
        copySelectionAsGeojson.mockResolvedValue(undefined)
        copySelectionAsWkt.mockResolvedValue(undefined)
        store = makeStore()
        store.dispatch(selectionSlice.actions.sync({ count: 3, sourceId: SOURCE_ID }))
    })

    test("copies as GeoJSON using the wrap setting", async () => {
        store.dispatch(copySelection("geojson"))
        await flush()

        expect(copySelectionAsGeojson).toHaveBeenCalledWith(SOURCE_ID, true)
    })

    test("respects the wrap setting when it is turned off", async () => {
        store.dispatch(settingsSlice.actions.setCopyWrapAsFeatureCollection(false))

        store.dispatch(copySelection("geojson"))
        await flush()

        expect(copySelectionAsGeojson).toHaveBeenCalledWith(SOURCE_ID, false)
    })

    test("copies as WKT using the separator setting", async () => {
        store.dispatch(settingsSlice.actions.setCopyWktSeparator(";"))

        store.dispatch(copySelection("wkt"))
        await flush()

        expect(copySelectionAsWkt).toHaveBeenCalledWith(SOURCE_ID, ";")
    })

    test("does nothing when the selection is empty", async () => {
        store.dispatch(selectionSlice.actions.reset())

        store.dispatch(copySelection("geojson"))
        await flush()

        expect(copySelectionAsGeojson).not.toHaveBeenCalled()
    })

    test("surfaces a failed copy as an error", async () => {
        copySelectionAsGeojson.mockRejectedValue(new Error("clipboard unavailable"))

        store.dispatch(copySelection("geojson"))
        await flush()

        expect(store.getState().error.message).toBe("clipboard unavailable")
    })
})
