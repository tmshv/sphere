import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { HILLSHADE_DEFAULTS, hillshadePaint } from "@/lib/terrain"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import type { RootState } from "./index"
import reducer, {
    selectHasTerrainSource,
    selectHillshadePaint,
    selectHillshadeSettings,
    selectHillshadeSourceId,
    selectTerrainCandidates,
    selectTerrainSource,
    selectTerrainSpecification,
    terrainSlice,
} from "./terrain"

const { pick, enableFor, setSource, setHillshade, updateHillshade, hide, toggle } = terrainSlice.actions

function raster(id: string, dem?: "terrarium" | "mapbox") {
    return {
        id,
        name: `Raster ${id}`,
        type: SourceType.Raster,
        location: `https://example.com/${id}`,
        editable: false as const,
        pending: false as const,
        dem,
    }
}

type Options = { terrain?: ReturnType<typeof reducer>; drawing?: boolean; hiddenIds?: string[] }

function makeState(sources: Parameters<typeof makeSourceState>[0], options: Options = {}) {
    return {
        source: makeSourceState(sources, { hiddenIds: options.hiddenIds }),
        terrain: options.terrain ?? reducer(undefined, { type: "init" }),
        draw: options.drawing ? { sourceId: "d" } : {},
    } as unknown as RootState
}

describe("terrain candidates", () => {
    test("exclude plain rasters and include hidden DEM sources, oldest first", () => {
        const state = makeState(
            [raster("osm"), raster("a", "terrarium"), makeGeojsonSource("g"), raster("b", "mapbox")],
            {
                hiddenIds: ["a"],
            },
        )
        expect(selectTerrainCandidates(state)).toEqual([
            { id: "a", name: "Raster a", encoding: "terrarium" },
            { id: "b", name: "Raster b", encoding: "mapbox" },
        ])
        expect(selectHasTerrainSource(state)).toBe(true)
    })

    test("has none without DEM sources", () => {
        const state = makeState([raster("osm")])
        expect(selectTerrainCandidates(state)).toEqual([])
        expect(selectHasTerrainSource(state)).toBe(false)
    })
})

describe("selectTerrainSource", () => {
    const sources = [raster("a", "terrarium"), raster("b", "terrarium")]

    test("returns the stored id when it is a candidate", () => {
        const terrain = reducer(undefined, setSource("a"))
        expect(selectTerrainSource(makeState(sources, { terrain }))?.id).toBe("a")
    })

    test("falls back to the last candidate when the stored id is gone", () => {
        const terrain = reducer(undefined, setSource("gone"))
        expect(selectTerrainSource(makeState(sources, { terrain }))?.id).toBe("b")
    })

    test("is null without candidates while show stays true", () => {
        const terrain = reducer(undefined, pick("a"))
        const state = makeState([raster("osm")], { terrain })
        expect(selectTerrainSource(state)).toBeNull()
        expect(state.terrain.show).toBe(true)
        expect(selectTerrainSpecification(state)).toBeNull()
        expect(selectHillshadeSourceId(state)).toBeNull()
    })
})

describe("selectTerrainSpecification", () => {
    const sources = [raster("a", "terrarium")]

    test("is null when terrain is off", () => {
        expect(selectTerrainSpecification(makeState(sources))).toBeNull()
    })

    test("is the terrain DEM source with the exaggeration", () => {
        const terrain = reducer(undefined, pick("a"))
        expect(selectTerrainSpecification(makeState(sources, { terrain }))).toEqual({
            source: "terrain-dem-a",
            exaggeration: 1.5,
        })
    })

    test("is null while drawing", () => {
        const terrain = reducer(undefined, pick("a"))
        expect(selectTerrainSpecification(makeState(sources, { terrain, drawing: true }))).toBeNull()
    })

    test("is null without a terrain source", () => {
        const terrain = reducer(undefined, pick("a"))
        expect(selectTerrainSpecification(makeState([raster("osm")], { terrain }))).toBeNull()
    })

    test("returns the same object while its inputs are unchanged", () => {
        const terrain = reducer(undefined, pick("a"))
        const state = makeState(sources, { terrain })
        const first = selectTerrainSpecification(state)

        expect(first).not.toBeNull()
        expect(selectTerrainSpecification(state)).toBe(first)
        // An unrelated change, like a hover or a viewport update, makes a new root state
        expect(selectTerrainSpecification({ ...state })).toBe(first)
    })
})

describe("terrain reducers", () => {
    test("pick sets the source and turns terrain on", () => {
        expect(reducer(undefined, pick("a"))).toMatchObject({ sourceId: "a", show: true, hillshade: false })
    })

    test("setSource only sets the source", () => {
        expect(reducer(undefined, setSource("a"))).toMatchObject({ sourceId: "a", show: false })
    })

    test("enableFor turns terrain and hillshade on", () => {
        expect(reducer(undefined, enableFor("a"))).toMatchObject({ sourceId: "a", show: true, hillshade: true })
    })

    test("setHillshade toggles hillshade", () => {
        expect(reducer(undefined, setHillshade(true)).hillshade).toBe(true)
    })
})

describe("selectHillshadeSourceId", () => {
    test("is null when hillshade is off, else the hillshade DEM source", () => {
        const sources = [raster("a", "terrarium")]
        expect(selectHillshadeSourceId(makeState(sources))).toBeNull()
        const terrain = reducer(undefined, enableFor("a"))
        expect(selectHillshadeSourceId(makeState(sources, { terrain }))).toBe("hillshade-dem-a")
        expect(
            selectHillshadeSourceId(makeState(sources, { terrain: reducer(terrain, setHillshade(false)) })),
        ).toBeNull()
    })
})

describe("hillshade follows the terrain toggle", () => {
    const sources = [raster("a", "terrarium")]

    test("turning terrain off removes the hillshade but keeps the user's hillshade switch", () => {
        const terrain = reducer(reducer(undefined, enableFor("a")), hide())
        expect(terrain.hillshade).toBe(true)
        expect(selectHillshadeSourceId(makeState(sources, { terrain }))).toBeNull()
    })

    test("turning terrain back on brings the hillshade back", () => {
        const terrain = reducer(reducer(reducer(undefined, enableFor("a")), toggle()), toggle())
        expect(selectHillshadeSourceId(makeState(sources, { terrain }))).toBe("hillshade-dem-a")
    })

    test("draw mode keeps the hillshade while it flattens the terrain", () => {
        const terrain = reducer(undefined, enableFor("a"))
        const state = makeState(sources, { terrain, drawing: true })
        expect(selectTerrainSpecification(state)).toBeNull()
        expect(selectHillshadeSourceId(state)).toBe("hillshade-dem-a")
    })
})

describe("hillshade settings", () => {
    test("start at MapLibre's defaults", () => {
        expect(selectHillshadeSettings(makeState([]))).toEqual(HILLSHADE_DEFAULTS)
    })

    test("updateHillshade changes only the given settings", () => {
        const terrain = reducer(undefined, updateHillshade({ intensity: 0.9, method: "igor" }))
        expect(selectHillshadeSettings(makeState([], { terrain }))).toEqual({
            ...HILLSHADE_DEFAULTS,
            intensity: 0.9,
            method: "igor",
        })
    })

    test("updateHillshade leaves the terrain toggles alone", () => {
        const before = reducer(undefined, enableFor("a"))
        const after = reducer(before, updateHillshade({ altitude: 10 }))
        expect(after).toMatchObject({ show: true, hillshade: true, sourceId: "a", exaggeration: before.exaggeration })
    })

    test("selectHillshadePaint is the paint of the settings, memoized", () => {
        const terrain = reducer(undefined, updateHillshade({ direction: 90 }))
        const state = makeState([], { terrain })
        expect(selectHillshadePaint(state)).toEqual(hillshadePaint({ ...HILLSHADE_DEFAULTS, direction: 90 }))
        expect(selectHillshadePaint(state)).toBe(selectHillshadePaint(state))
    })
})
