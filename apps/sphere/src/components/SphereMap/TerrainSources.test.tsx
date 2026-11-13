import sourceReducer from "@/store/source"
import terrainReducer, { terrainSlice } from "@/store/terrain"
import { makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { configureStore } from "@reduxjs/toolkit"
import { act, render } from "@testing-library/react"
import type { ReactNode } from "react"
import type { LayerProps, SourceProps } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TerrainSources } from "./TerrainSources"

// Latest props of every source, and the paint of every layer, rendered since the last reset, keyed by id
const sources = new Map<string, SourceProps>()
const paints = new Map<string, unknown>()

// Mounted sources and layers render as elements, so the DOM shows what is on the map. Like react-map-gl,
// a source keeps the id it mounted with, so a source that is reused for another id shows its stale id.
vi.mock("react-map-gl/maplibre", async () => {
    const { useState } = await import("react")
    return {
        Source: ({ children, ...props }: SourceProps & { children?: ReactNode }) => {
            const [id] = useState(props.id)
            if (id) {
                sources.set(id, props)
            }
            return <div data-source={id}>{children}</div>
        },
        Layer: (props: LayerProps) => {
            if (props.id) {
                paints.set(props.id, "paint" in props ? props.paint : undefined)
            }
            return <div data-layer={props.id} data-type={props.type} />
        },
    }
})

const { show, hide, setHillshade, setSource, updateHillshade } = terrainSlice.actions

function dem(id: string): Source {
    return {
        id,
        name: `DEM ${id}`,
        type: SourceType.Raster,
        location: `https://example.com/${id}.json`,
        editable: false,
        pending: false,
        dem: "terrarium",
    }
}

function osm(): Source {
    return {
        id: "osm",
        name: "OSM",
        type: SourceType.Raster,
        location: "https://example.com/osm.json",
        editable: false,
        pending: false,
    }
}

function renderTerrainSources(items: Source[]) {
    const store = configureStore({
        reducer: { source: sourceReducer, terrain: terrainReducer },
        preloadedState: { source: makeSourceState(items) },
    })
    const { container } = render(
        <Provider store={store}>
            <TerrainSources />
        </Provider>,
    )
    const mountedSources = () =>
        [...container.querySelectorAll<HTMLElement>("[data-source]")].map(el => el.dataset.source)
    const mountedLayers = () =>
        [...container.querySelectorAll<HTMLElement>("[data-layer]")].map(el => ({
            id: el.dataset.layer,
            type: el.dataset.type,
            source: el.closest<HTMLElement>("[data-source]")?.dataset.source,
        }))
    return { store, mountedSources, mountedLayers }
}

describe("TerrainSources", () => {
    beforeEach(() => {
        sources.clear()
        paints.clear()
    })

    it("mounts only the terrain source while terrain is on and hillshade off", () => {
        const { store, mountedSources, mountedLayers } = renderTerrainSources([dem("a")])
        act(() => {
            store.dispatch(show())
        })

        expect(mountedSources()).toEqual(["terrain-dem-a"])
        expect(mountedLayers()).toEqual([])
        expect(sources.get("terrain-dem-a")).toEqual({
            id: "terrain-dem-a",
            type: "raster-dem",
            url: "https://example.com/a.json",
            encoding: "terrarium",
        })
    })

    it("mounts no hillshade while terrain is off, even with the hillshade switch on", () => {
        const { store, mountedSources, mountedLayers } = renderTerrainSources([dem("a")])
        act(() => {
            store.dispatch(setHillshade(true))
        })

        expect(mountedSources()).toEqual([])
        expect(mountedLayers()).toEqual([])
    })

    it("mounts the hillshade source and layer while terrain and hillshade are on", () => {
        const { store, mountedLayers } = renderTerrainSources([dem("a")])
        act(() => {
            store.dispatch(show())
            store.dispatch(setHillshade(true))
        })

        expect(mountedLayers()).toEqual([{ id: "sphere-hillshade", type: "hillshade", source: "hillshade-dem-a" }])
        expect(sources.get("hillshade-dem-a")).toMatchObject({ type: "raster-dem", encoding: "terrarium" })
    })

    it("paints the hillshade layer with the hillshade settings", () => {
        const { store } = renderTerrainSources([dem("a")])
        act(() => {
            store.dispatch(show())
            store.dispatch(setHillshade(true))
            store.dispatch(updateHillshade({ intensity: 0.9, accentColor: "#ff0000" }))
        })

        expect(paints.get("sphere-hillshade")).toMatchObject({
            "hillshade-exaggeration": 0.9,
            "hillshade-accent-color": "#ff0000",
        })
    })

    it("mounts nothing without a terrain candidate", () => {
        const { store, mountedSources, mountedLayers } = renderTerrainSources([osm()])
        act(() => {
            store.dispatch(show())
            store.dispatch(setHillshade(true))
        })

        expect(mountedSources()).toEqual([])
        expect(mountedLayers()).toEqual([])
    })

    it("mounts nothing while terrain and hillshade are off", () => {
        const { mountedSources } = renderTerrainSources([dem("a")])

        expect(mountedSources()).toEqual([])
    })

    it("mounts both sources of the current terrain source", () => {
        const { store, mountedSources } = renderTerrainSources([dem("a"), dem("b")])
        act(() => {
            store.dispatch(show())
            store.dispatch(setHillshade(true))
            store.dispatch(setSource("a"))
        })

        expect(mountedSources()).toEqual(["terrain-dem-a", "hillshade-dem-a"])
    })

    it("remounts the sources when the current terrain source changes", () => {
        const { store, mountedSources, mountedLayers } = renderTerrainSources([dem("a"), dem("b")])
        act(() => {
            store.dispatch(show())
            store.dispatch(setHillshade(true))
            store.dispatch(setSource("a"))
        })
        act(() => {
            store.dispatch(setSource("b"))
        })

        expect(mountedSources()).toEqual(["terrain-dem-b", "hillshade-dem-b"])
        expect(mountedLayers()).toEqual([{ id: "sphere-hillshade", type: "hillshade", source: "hillshade-dem-b" }])
    })

    it("unmounts the terrain source when terrain is turned off", () => {
        const { store, mountedSources } = renderTerrainSources([dem("a")])
        act(() => {
            store.dispatch(show())
        })
        act(() => {
            store.dispatch(hide())
        })

        expect(mountedSources()).toEqual([])
    })
})
