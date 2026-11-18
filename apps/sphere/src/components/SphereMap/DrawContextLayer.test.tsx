import drawReducer, { drawSlice } from "@/store/draw"
import settingsReducer, { settingsSlice } from "@/store/settings"
import sourceReducer from "@/store/source"
import { layerPaint, layerVisibility, makeGeojsonSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { configureStore } from "@reduxjs/toolkit"
import { act, render } from "@testing-library/react"
import type { LayerProps } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DrawContextLayer } from "./DrawContextLayer"

// Latest props of every mounted layer, in the order the layers first rendered; removed on unmount
const layers = new Map<string, LayerProps>()

vi.mock("react-map-gl/maplibre", async () => {
    const { useEffect } = await import("react")
    return {
        Layer: (props: LayerProps) => {
            const { id } = props
            if (id) {
                layers.set(id, props)
            }
            useEffect(
                () => () => {
                    if (id) {
                        layers.delete(id)
                    }
                },
                [id],
            )
            return null
        },
    }
})

const POINT_FILTER = ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]

function geojson(id: string): Source {
    const { meta, location } = makeGeojsonSource(id)
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.FeatureCollection,
        version: 0,
        location,
        editable: true,
        pending: false,
        meta,
    }
}

function renderContext(draw: { sourceId?: string; hiddenIds: number[] }) {
    const store = configureStore({
        reducer: { draw: drawReducer, source: sourceReducer, settings: settingsReducer },
        preloadedState: {
            draw: {
                pending: false,
                actionable: { trash: false, combineFeatures: false, uncombineFeatures: false },
                ...draw,
            },
            source: makeSourceState([geojson("a"), geojson("b")]),
        },
    })
    render(
        <Provider store={store}>
            <DrawContextLayer />
        </Provider>,
    )
    return store
}

function visibilityOf(props: LayerProps | undefined) {
    return props === undefined ? undefined : layerVisibility(props)
}

function filterOf(props: LayerProps | undefined) {
    return props !== undefined && "filter" in props ? props.filter : undefined
}

describe("DrawContextLayer", () => {
    beforeEach(() => {
        layers.clear()
    })

    it("draws nothing while not drawing", () => {
        renderContext({ hiddenIds: [] })

        expect([...layers.keys()]).toEqual([])
    })

    it("draws the drawn source only, polygons first so points land on top", () => {
        renderContext({ sourceId: "a", hiddenIds: [] })

        expect([...layers.keys()]).toEqual([
            "draw-context-a-polygon",
            "draw-context-a-polygon-outline-0",
            "draw-context-a-polygon-outline-1",
            "draw-context-a-line-outline",
            "draw-context-a-line",
            "draw-context-a-point",
        ])
        for (const props of layers.values()) {
            expect(props).toMatchObject({ source: "a" })
            // Mounted on top of the map at render, before the draw control adds its layers in an effect
            expect(props.beforeId).toBeUndefined()
        }
    })

    it("hides every id loaded into draw on every layer", () => {
        renderContext({ sourceId: "a", hiddenIds: [7, 3] })

        expect(filterOf(layers.get("draw-context-a-point"))).toEqual([
            "all",
            POINT_FILTER,
            ["match", ["id"], [3, 7], false, true],
        ])
        for (const props of layers.values()) {
            expect(filterOf(props)).toContainEqual(["match", ["id"], [3, 7], false, true])
        }
    })

    it("keeps only the geometry filter when nothing is loaded into draw", () => {
        renderContext({ sourceId: "a", hiddenIds: [] })

        expect(filterOf(layers.get("draw-context-a-point"))).toEqual(POINT_FILTER)
    })

    it("updates the filter when the loaded ids change, keeping the same layers", () => {
        const store = renderContext({ sourceId: "a", hiddenIds: [1] })

        act(() => {
            store.dispatch(drawSlice.actions.setHiddenIds({ sourceId: "a", ids: [1, 2] }))
        })

        expect(layers.size).toBe(6)
        expect(filterOf(layers.get("draw-context-a-point"))).toEqual([
            "all",
            POINT_FILTER,
            ["match", ["id"], [1, 2], false, true],
        ])
    })

    it("uses the preview look and follows the preview outline setting", () => {
        const store = renderContext({ sourceId: "a", hiddenIds: [] })

        expect(layerPaint(layers.get("draw-context-a-point"))).toMatchObject({ "circle-radius": 3 })
        expect(visibilityOf(layers.get("draw-context-a-line-outline"))).toBe("visible")

        act(() => {
            store.dispatch(settingsSlice.actions.togglePreviewOutline())
        })

        expect(visibilityOf(layers.get("draw-context-a-line-outline"))).toBe("none")
    })

    it("disappears when draw mode ends", () => {
        const store = renderContext({ sourceId: "a", hiddenIds: [1] })

        act(() => {
            store.dispatch(drawSlice.actions.done({ sourceId: "a" }))
        })

        expect([...layers.keys()]).toEqual([])
        expect(store.getState().draw.hiddenIds).toEqual([])
    })
})
