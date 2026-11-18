import { afterEach, describe, expect, test } from "vitest"
import appReducer from "@/store/app"
import drawReducer from "@/store/draw"
import mapInteractionReducer from "@/store/map-interaction"
import toolsReducer from "@/store/tools"
import mapToolChanged from "@/store/listeners/map-tool-changed"
import { actions } from "@/store/actions"
import MapLibreDraw from "@sphere/draw"
import { configureStore } from "@reduxjs/toolkit"
import { act, cleanup, render } from "@testing-library/react"
import type { Map as MaplibreMap } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import { useAppSelector } from "@/store/hooks"
import MapNavigation from "./MapNavigation"

const SOURCE_ID = "s1"

/** A map interaction handler with just its enabled flag. */
function interaction() {
    let enabled = true
    return {
        enable: () => {
            enabled = true
        },
        disable: () => {
            enabled = false
        },
        isEnabled: () => enabled,
    }
}

/** The members of MapLibre's map the hook and the draw control use, with stateful interactions. */
function makeMap() {
    const container = document.createElement("div")
    return {
        dragPan: interaction(),
        dragRotate: interaction(),
        scrollZoom: interaction(),
        boxZoom: interaction(),
        keyboard: interaction(),
        doubleClickZoom: interaction(),
        touchZoomRotate: interaction(),
        getContainer: () => container,
        getCanvasContainer: () => container,
        loaded: () => true,
        on: () => undefined,
        off: () => undefined,
        fire: () => undefined,
        addSource: () => undefined,
        removeSource: () => undefined,
        getSource: () => undefined,
        addLayer: () => undefined,
        removeLayer: () => undefined,
        getLayer: () => undefined,
    }
}

type FakeMap = ReturnType<typeof makeMap>

/** The real draw control's life on the map, as `Draw.tsx` mounts it through `useControl` while drawing. */
function DrawControl({ map }: { map: FakeMap }) {
    useEffect(() => {
        const draw = new MapLibreDraw({ displayControlsDefault: false, boxSelect: false })
        // Test double: the fake map holds only the members draw touches
        draw.onAdd(map as unknown as MaplibreMap)
        return () => {
            draw.onRemove()
        }
    }, [map])
    return null
}

type Order = "navigation first" | "draw control first"

type MapBodyProps = { map: FakeMap; mapRef: MapRef; order: Order }

/** The navigation and, while drawing, the draw control, as siblings in either order. */
function MapBody({ map, mapRef, order }: MapBodyProps) {
    const drawing = useAppSelector(state => state.draw.sourceId !== undefined)
    const control = drawing ? <DrawControl map={map} /> : null
    const navigation = <MapNavigation mapRef={mapRef} />
    return order === "navigation first" ? (
        <>
            {navigation}
            {control}
        </>
    ) : (
        <>
            {control}
            {navigation}
        </>
    )
}

function setup(order: Order) {
    const store = configureStore({
        reducer: { app: appReducer, draw: drawReducer, mapInteraction: mapInteractionReducer, tools: toolsReducer },
        middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(mapToolChanged.middleware),
    })
    const map = makeMap()
    // Test double of the map ref, stable like the one `useMap` returns: the hook reads only getMap()
    const mapRef = { getMap: () => map } as unknown as MapRef
    render(
        <Provider store={store}>
            <MapBody map={map} mapRef={mapRef} order={order} />
        </Provider>,
    )
    const dispatch = (action: Parameters<typeof store.dispatch>[0]) => {
        act(() => {
            store.dispatch(action)
        })
    }
    // What the start-draw listener dispatches once the backend session began
    const startDraw = () => {
        act(() => {
            store.dispatch(actions.draw.started({ sourceId: SOURCE_ID }))
            store.dispatch(actions.tools.setTool("draw"))
        })
    }
    // What the save-draw listener dispatches once the commit succeeded
    const done = () => {
        act(() => {
            store.dispatch(actions.draw.done({ sourceId: SOURCE_ID }))
            store.dispatch(actions.tools.reset())
        })
    }
    // What the save-draw listener dispatches once the rollback succeeded
    const cancel = () => {
        act(() => {
            store.dispatch(actions.draw.reset())
            store.dispatch(actions.tools.reset())
        })
    }
    return { store, map, dispatch, startDraw, done, cancel }
}

const ORDERS: Order[] = ["navigation first", "draw control first"]

describe.each(ORDERS)("MapNavigation around a draw session, %s", order => {
    afterEach(() => {
        cleanup()
    })

    test("a session started from Select ends with the map panning on Navigation", () => {
        const { store, map, dispatch, startDraw, done } = setup(order)
        dispatch(actions.app.setMapTool("select"))
        expect(map.dragPan.isEnabled()).toBe(false)

        startDraw()
        expect(store.getState().app.mapTool).toBe("navigation")
        expect(map.dragPan.isEnabled()).toBe(true)

        done()
        expect(store.getState().app.mapTool).toBe("navigation")
        expect(map.dragPan.isEnabled()).toBe(true)
        expect(map.dragRotate.isEnabled()).toBe(true)
    })

    test("switching to Select mid-session keeps the map from panning after Done", () => {
        const { map, dispatch, startDraw, done } = setup(order)
        startDraw()
        expect(map.dragPan.isEnabled()).toBe(true)

        dispatch(actions.app.setMapTool("select"))
        expect(map.dragPan.isEnabled()).toBe(false)

        done()
        expect(map.dragPan.isEnabled()).toBe(false)
        expect(map.dragRotate.isEnabled()).toBe(false)
    })

    test("Cancel ends a session started from Select with the map panning on Navigation", () => {
        const { map, dispatch, startDraw, cancel } = setup(order)
        dispatch(actions.app.setMapTool("select"))
        startDraw()
        cancel()
        expect(map.dragPan.isEnabled()).toBe(true)
        expect(map.dragRotate.isEnabled()).toBe(true)
    })
})
