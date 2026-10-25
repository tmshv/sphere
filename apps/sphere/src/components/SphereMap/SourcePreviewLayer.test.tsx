import appReducer from "@/store/app"
import sourceReducer, { sourceSlice } from "@/store/source"
import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { act, render } from "@testing-library/react"
import { configureStore } from "@reduxjs/toolkit"
import type { LayerProps } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SourcePreviewLayer } from "./SourcePreviewLayer"

const MAP_ID = "main"

// Latest props of every mounted layer, in the order the layers last rendered
const layers = new Map<string, LayerProps>()

const map = {
    getLayersOrder: vi.fn((): string[] => []),
    moveLayer: vi.fn(),
}

vi.mock("react-map-gl/maplibre", () => ({
    Layer: (props: LayerProps) => {
        if (props.id) {
            layers.delete(props.id)
            layers.set(props.id, props)
        }
        return null
    },
    useMap: () => ({ [MAP_ID]: { getMap: () => map } }),
}))

vi.mock("@/hooks/useFeatureProperties", () => ({
    default: vi.fn(),
}))

function geojson(id: string): Source {
    const { meta, location } = makeGeojsonSource(id)
    return {
        id,
        name: `Source ${id}`,
        type: SourceType.Geojson,
        format: "geojson",
        version: 0,
        location,
        editable: false,
        pending: false,
        meta,
    }
}

function renderPreview() {
    const store = configureStore({
        reducer: { app: appReducer, source: sourceReducer },
        preloadedState: { source: makeSourceState([geojson("a"), geojson("b")]) },
    })
    render(
        <Provider store={store}>
            <SourcePreviewLayer mapId={MAP_ID} delay={0} />
        </Provider>,
    )
    return store
}

function beforeIds() {
    return Object.fromEntries([...layers].map(([id, props]) => [id, props.beforeId]))
}

describe("SourcePreviewLayer", () => {
    beforeEach(() => {
        layers.clear()
        map.moveLayer.mockClear()
        map.getLayersOrder.mockReturnValue([])
    })

    it("mounts the tree top first, each layer below the bottom layer of the node above", () => {
        renderPreview()

        expect([...layers.keys()].at(0)).toBe("preview-a-point")
        expect(beforeIds()).toEqual({
            "preview-a-point": undefined,
            "preview-a-line-outline": "preview-a-point",
            "preview-a-line": "preview-a-point",
            "preview-a-polygon": "preview-a-line-outline",
            "preview-a-polygon-outline-0": "preview-a-line-outline",
            "preview-a-polygon-outline-1": "preview-a-line-outline",
            "preview-b-point": "preview-a-polygon",
            "preview-b-line-outline": "preview-b-point",
            "preview-b-line": "preview-b-point",
            "preview-b-polygon": "preview-b-line-outline",
            "preview-b-polygon-outline-0": "preview-b-line-outline",
            "preview-b-polygon-outline-1": "preview-b-line-outline",
        })
    })

    it("re-points beforeId when a root moves to the top", () => {
        const store = renderPreview()

        act(() => {
            store.dispatch(sourceSlice.actions.move({ ids: ["b"], index: 0 }))
        })

        expect(beforeIds()).toMatchObject({
            "preview-b-point": undefined,
            "preview-a-point": "preview-b-polygon",
        })
    })

    it("restacks the layers on the map after a move", () => {
        const store = renderPreview()
        map.getLayersOrder.mockReturnValue([...layers.keys()].reverse())

        act(() => {
            store.dispatch(sourceSlice.actions.move({ ids: ["b"], index: 0 }))
        })

        expect(map.moveLayer).toHaveBeenCalled()
    })
})
