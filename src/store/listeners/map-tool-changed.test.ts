import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test } from "vitest"
import app, { actions as appActions } from "../app"
import mapInteraction, { mapInteractionSlice } from "../map-interaction"
import tools, { toolsSlice } from "../tools"
import mapToolChanged from "./map-tool-changed"

function makeStore() {
    return configureStore({
        reducer: { app, mapInteraction, tools },
        middleware: gDM => gDM().prepend(mapToolChanged.middleware),
    })
}

const { selectDragPan, selectScrollZoom, selectDragRotate } = mapInteractionSlice.selectors

describe("map-tool-changed listener", () => {
    let store: ReturnType<typeof makeStore>

    beforeEach(() => {
        store = makeStore()
    })

    test("navigation enables dragPan, scrollZoom, dragRotate", () => {
        store.dispatch(appActions.setMapTool("select"))
        store.dispatch(appActions.setMapTool("navigation"))
        const state = store.getState()
        expect(selectDragPan(state)).toBe(true)
        expect(selectScrollZoom(state)).toBe(true)
        expect(selectDragRotate(state)).toBe(true)
    })

    test("select disables dragPan and dragRotate", () => {
        store.dispatch(appActions.setMapTool("select"))
        const state = store.getState()
        expect(selectDragPan(state)).toBe(false)
        expect(selectDragRotate(state)).toBe(false)
    })

    test("info disables dragPan and dragRotate", () => {
        store.dispatch(appActions.setMapTool("info"))
        const state = store.getState()
        expect(selectDragPan(state)).toBe(false)
        expect(selectDragRotate(state)).toBe(false)
    })

    test("entering draw mode resets tool to navigation", () => {
        store.dispatch(appActions.setMapTool("select"))
        store.dispatch(toolsSlice.actions.setTool("draw"))
        expect(store.getState().app.mapTool).toBe("navigation")
    })
})
