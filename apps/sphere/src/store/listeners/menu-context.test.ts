import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test, vi } from "vitest"

const invoke = vi.fn().mockResolvedValue(undefined)

vi.mock("@tauri-apps/api/core", () => ({
    invoke: (...args: unknown[]) => invoke(...args),
}))

import app from "../app"
import layer, { actions as layerActions } from "../layer"
import selection, { selectionSlice } from "../selection"
import sourceReducer, { actions as sourceActions } from "../source"
import menuContext from "./menu-context"

const LAYER_ID = "layer-1"
const SOURCE_ID = "source-1"

function makeStore() {
    return configureStore({
        reducer: { app, source: sourceReducer, layer, selection },
        middleware: gDM => gDM().prepend(menuContext.middleware),
    })
}

async function flush() {
    await new Promise(resolve => setTimeout(resolve, 0))
}

function lastContext() {
    const call = invoke.mock.calls.at(-1)
    return call?.at(1)
}

describe("menu-context listener", () => {
    let store: ReturnType<typeof makeStore>

    beforeEach(() => {
        vi.clearAllMocks()
        store = makeStore()
    })

    test("reports a selected source", async () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        await flush()

        expect(invoke).toHaveBeenCalledWith("menu_set_context", {
            context: { hasSource: true, hasLayer: false, hasSelection: false },
        })
    })

    test("reports a selected layer", async () => {
        store.dispatch(
            layerActions.addLayer({
                id: LAYER_ID,
                fractionIndex: 0.5,
                visible: true,
                name: "Layer",
                color: "#ff0000",
            }),
        )
        store.dispatch(layerActions.select(LAYER_ID))
        await flush()

        expect(lastContext()).toEqual({
            context: { hasSource: false, hasLayer: true, hasSelection: false },
        })
    })

    test("reports a feature selection", async () => {
        store.dispatch(selectionSlice.actions.sync({ count: 4, sourceId: SOURCE_ID }))
        await flush()

        expect(lastContext()).toEqual({
            context: { hasSource: false, hasLayer: false, hasSelection: true },
        })
    })

    test("does not report a selection of zero features", async () => {
        store.dispatch(selectionSlice.actions.sync({ count: 0, sourceId: SOURCE_ID }))
        await flush()

        expect(invoke).not.toHaveBeenCalled()
    })

    test("reports again when the context changes back", async () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        await flush()
        store.dispatch(sourceActions.select(undefined))
        await flush()

        expect(lastContext()).toEqual({
            context: { hasSource: false, hasLayer: false, hasSelection: false },
        })
    })

    test("stays quiet when the context is unchanged", async () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        await flush()
        invoke.mockClear()

        store.dispatch(sourceActions.setName({ id: SOURCE_ID, value: "renamed" }))
        await flush()

        expect(invoke).not.toHaveBeenCalled()
    })
})
