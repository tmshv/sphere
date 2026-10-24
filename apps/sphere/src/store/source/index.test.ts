import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import type { TileJSON } from "@/types/tilejson"
import { describe, expect, test } from "vitest"
import type { RootState } from "../index"
import reducer, { sourceSlice } from "./index"

const {
    addFolder,
    addGeojsonSource,
    addMVTSource,
    addRasterSource,
    removeSource,
    select,
    setName,
    setVisible,
    setExpanded,
    move,
    reset,
    addInMemorySource,
    bumpVersion,
} = sourceSlice.actions
const { items, allIds, nodes, rootIds, expandedIds, selectSelectedIds, selectSelectedId } = sourceSlice.selectors

const makeRootState = (source: object) => ({ source }) as unknown as RootState

const meta = {
    columns: {},
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 0,
    multiLinesCount: 0,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 0,
}

const tilejson: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    vector_layers: [],
    attribution: null,
    description: null,
    legend: null,
    template: null,
    name: null,
}

const roadsAndWater = [
    { id: "roads", name: "roads" },
    { id: "water", name: "water" },
]

function addGeojson(id: string, name = `Source ${id}`) {
    return addGeojsonSource({ id, name, location: `${id}.geojson`, format: "geojson", meta })
}

function addMvt(id: string, format: "pbf" | "png", sourceLayers?: { id: string; name: string }[]) {
    return addMVTSource({ id, name: `MVT ${id}`, location: `${id}.mbtiles`, tilejson, format, sourceLayers })
}

function run(...actions: Parameters<typeof reducer>[1][]) {
    return actions.reduce(reducer, reducer(undefined, { type: "@@INIT" }))
}

describe("sourceSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.items).toEqual({})
        expect(state.allIds).toEqual([])
        expect(state.lastAdded).toBeUndefined()
        expect(state.nodes).toEqual({})
        expect(state.rootIds).toEqual([])
        expect(state.expandedIds).toEqual([])
        expect(state.selectedIds).toEqual([])
    })

    test("addGeojsonSource adds to items and allIds, sets lastAdded", () => {
        const state = run(addGeojson("s1", "My Source"))
        expect(state.allIds).toContain("s1")
        expect(state.items.s1).toBeDefined()
        expect(state.items.s1.name).toBe("My Source")
        expect(state.items.s1.type).toBe(SourceType.Geojson)
        expect(state.items.s1.editable).toBe(false)
        expect(state.lastAdded).toBe("s1")
    })

    test("addGeojsonSource creates a visible root source node", () => {
        const state = run(addGeojson("s1", "My Source"))
        expect(state.rootIds).toEqual(["s1"])
        expect(state.nodes.s1).toEqual({ id: "s1", name: "My Source", kind: "source", visible: true, children: [] })
        expect(state.expandedIds).toEqual([])
    })

    test("addMVTSource adds to items and allIds, sets lastAdded", () => {
        const state = run(addMvt("s2", "pbf"))
        expect(state.allIds).toContain("s2")
        expect(state.items.s2.type).toBe(SourceType.MVT)
        const s2 = state.items.s2
        if (s2.type === SourceType.MVT) {
            expect(s2.format).toBe("pbf")
        }
        expect(state.lastAdded).toBe("s2")
    })

    test("addMVTSource with vector layers creates children in order and expands the root", () => {
        const state = run(addMvt("m", "pbf", roadsAndWater))
        expect(state.rootIds).toEqual(["m"])
        expect(state.nodes.m?.children).toEqual(["m/roads", "m/water"])
        expect(state.nodes["m/roads"]).toEqual({
            id: "m/roads",
            name: "roads",
            kind: "source-layer",
            sourceLayer: "roads",
            parentId: "m",
            visible: true,
            children: [],
        })
        expect(state.nodes["m/water"]?.parentId).toBe("m")
        expect(state.expandedIds).toEqual(["m"])
    })

    test("addMVTSource keeps sourceLayers on the item", () => {
        const state = run(addMvt("m", "pbf", roadsAndWater))
        const m = state.items.m
        if (m.type !== SourceType.MVT) {
            throw new Error("Expected VectorSource")
        }
        expect(m.sourceLayers).toEqual(roadsAndWater)
    })

    test("addMVTSource with a raster format creates no children", () => {
        const state = run(addMvt("r", "png", roadsAndWater))
        expect(state.nodes.r?.children).toEqual([])
        expect(Object.keys(state.nodes)).toEqual(["r"])
        expect(state.expandedIds).toEqual([])
    })

    test("addMVTSource with empty sourceLayers creates no children and does not expand", () => {
        const state = run(addMvt("m", "pbf", []))
        expect(state.nodes.m?.children).toEqual([])
        expect(state.expandedIds).toEqual([])
    })

    test("addRasterSource adds to items and allIds, sets lastAdded, creates a root node", () => {
        const state = run(addRasterSource({ id: "s3", name: "Raster Source", location: "raster.mbtiles" }))
        expect(state.allIds).toContain("s3")
        expect(state.items.s3.type).toBe(SourceType.Raster)
        expect(state.lastAdded).toBe("s3")
        expect(state.rootIds).toEqual(["s3"])
        expect(state.nodes.s3?.kind).toBe("source")
    })

    test("addInMemorySource adds to items and allIds, sets version 0 and pending false", () => {
        const fcMeta = { ...meta, pointsCount: 1, featuresCount: 1 }
        const state = run(addInMemorySource({ id: "s4", name: "FC Source", location: "sphere://s4", meta: fcMeta }))
        expect(state.allIds).toContain("s4")
        expect(state.items.s4.type).toBe(SourceType.FeatureCollection)
        expect(state.items.s4.editable).toBe(true)
        expect(state.items.s4.pending).toBe(false)
        expect(state.lastAdded).toBe("s4")
        expect(state.rootIds).toEqual(["s4"])
        expect(state.nodes.s4?.kind).toBe("source")
        const s4 = state.items.s4
        if (s4.type !== SourceType.FeatureCollection || s4.pending) {
            throw new Error("Expected non-pending FeatureCollectionSource")
        }
        expect(s4.version).toBe(0)
        expect(s4.location).toBe("sphere://s4")
        expect(s4.meta).toEqual(fcMeta)
    })

    test("each add puts the new root at the top of rootIds", () => {
        const state = run(
            addGeojson("s1"),
            addMvt("s2", "pbf"),
            addRasterSource({ id: "s3", name: "R", location: "r.mbtiles" }),
            addInMemorySource({ id: "s4", name: "FC", location: "sphere://s4", meta }),
        )
        expect(state.rootIds).toEqual(["s4", "s3", "s2", "s1"])
    })

    test("re-adding an existing id keeps one entry in rootIds and allIds, in place", () => {
        const state = run(addGeojson("s1"), addGeojson("s2"), addGeojson("s1", "Renamed"))
        expect(state.rootIds).toEqual(["s2", "s1"])
        expect(state.allIds).toEqual(["s1", "s2"])
        expect(state.nodes.s1?.name).toBe("Renamed")
    })

    test("re-adding an MVT source does not duplicate children", () => {
        const state = run(addMvt("m", "pbf", roadsAndWater), addMvt("m", "pbf", roadsAndWater))
        expect(state.nodes.m?.children).toEqual(["m/roads", "m/water"])
        expect(state.expandedIds).toEqual(["m"])
    })

    test("re-adding an MVT source keeps each surviving child's visibility", () => {
        const state = run(
            addMvt("m", "pbf", roadsAndWater),
            setVisible({ id: "m/water", value: false }),
            addMvt("m", "pbf", roadsAndWater),
        )
        expect(state.nodes["m/roads"]?.visible).toBe(true)
        expect(state.nodes["m/water"]?.visible).toBe(false)
    })

    test("re-adding an MVT source keeps the existing child order, drops removed and appends new children", () => {
        const state = run(
            addMvt("m", "pbf", [...roadsAndWater, { id: "parks", name: "parks" }]),
            move({ ids: ["m/parks"], parentId: "m", index: 0 }),
            addMvt("m", "pbf", [{ id: "buildings", name: "buildings" }, ...roadsAndWater]),
        )
        expect(state.nodes.m?.children).toEqual(["m/roads", "m/water", "m/buildings"])
        expect(state.nodes["m/parks"]).toBeUndefined()
        expect(state.nodes["m/buildings"]?.visible).toBe(true)
    })

    test("re-adding an MVT source keeps a collapsed root collapsed", () => {
        const state = run(
            addMvt("m", "pbf", roadsAndWater),
            setExpanded({ id: "m", value: false }),
            addMvt("m", "pbf", roadsAndWater),
        )
        expect(state.expandedIds).toEqual([])
    })

    test("re-adding a childless MVT source with vector layers expands it", () => {
        const state = run(addMvt("m", "pbf", []), addMvt("m", "pbf", roadsAndWater))
        expect(state.expandedIds).toEqual(["m"])
    })

    test("bumpVersion increments version for FeatureCollection source", () => {
        let state = run(addInMemorySource({ id: "s4", name: "FC Source", location: "sphere://s4", meta }))
        state = reducer(state, bumpVersion("s4"))
        const s4 = state.items.s4
        if (s4.type !== SourceType.FeatureCollection || s4.pending) {
            throw new Error("Expected non-pending FeatureCollectionSource")
        }
        expect(s4.version).toBe(1)
        state = reducer(state, bumpVersion("s4"))
        const s4b = state.items.s4
        if (s4b.type !== SourceType.FeatureCollection || s4b.pending) {
            throw new Error("Expected non-pending FeatureCollectionSource")
        }
        expect(s4b.version).toBe(2)
    })

    test("bumpVersion does nothing for pending FeatureCollection source", () => {
        const pending = {
            id: "s4",
            name: "FC Source",
            type: SourceType.FeatureCollection,
            editable: true as const,
            pending: true as const,
        }
        const state = makeSourceState([pending])
        const next = reducer(state as unknown as ReturnType<typeof reducer>, bumpVersion("s4"))
        expect(next.items.s4).toEqual(pending)
    })

    test("bumpVersion increments version for Geojson source", () => {
        let state = run(addGeojson("s1"))
        state = reducer(state, bumpVersion("s1"))
        const s1 = state.items.s1
        if (s1.type !== SourceType.Geojson) {
            throw new Error("Expected GeojsonSource")
        }
        expect(s1.version).toBe(1)
        state = reducer(state, bumpVersion("s1"))
        const s1b = state.items.s1
        if (s1b.type !== SourceType.Geojson) {
            throw new Error("Expected GeojsonSource")
        }
        expect(s1b.version).toBe(2)
    })

    test("bumpVersion does nothing for a source with no version field (Raster)", () => {
        let state = run(addRasterSource({ id: "s3", name: "Raster Source", location: "raster.mbtiles" }))
        state = reducer(state, bumpVersion("s3"))
        expect(state.items.s3).toEqual({
            id: "s3",
            name: "Raster Source",
            location: "raster.mbtiles",
            type: SourceType.Raster,
            pending: false,
            editable: false,
        })
    })

    test("removeSource removes from items and allIds", () => {
        const state = run(addGeojson("s1"), removeSource("s1"))
        expect(state.allIds).not.toContain("s1")
        expect(state.items.s1).toBeUndefined()
        expect(state.rootIds).toEqual([])
        expect(state.nodes).toEqual({})
    })

    test("removeSource clears lastAdded when it matches", () => {
        const state = run(addGeojson("s1"), removeSource("s1"))
        expect(state.lastAdded).toBeUndefined()
    })

    test("removeSource does not clear lastAdded when it differs", () => {
        const state = run(addGeojson("s1"), addGeojson("s2"), removeSource("s1"))
        expect(state.lastAdded).toBe("s2")
    })

    test("removeSource of a root drops its subtree, item, expanded and selected entries", () => {
        const state = run(addGeojson("s1"), addMvt("m", "pbf", roadsAndWater), select("m/roads"), removeSource("m"))
        expect(state.rootIds).toEqual(["s1"])
        expect(Object.keys(state.nodes)).toEqual(["s1"])
        expect(state.items.m).toBeUndefined()
        expect(state.allIds).toEqual(["s1"])
        expect(state.expandedIds).toEqual([])
        expect(state.selectedIds).toEqual([])
    })

    test("removeSource of a child node is a no-op", () => {
        const before = run(addMvt("m", "pbf", roadsAndWater), select("m/roads"))
        const state = reducer(before, removeSource("m/roads"))
        expect(state).toEqual(before)
    })

    test("removeSource clears selectedIds when it matches", () => {
        const state = run(addGeojson("s1"), select("s1"), removeSource("s1"))
        expect(state.selectedIds).toEqual([])
    })

    test("removeSource does not clear selectedIds when it does not match", () => {
        const state = run(addGeojson("s1"), addGeojson("s2"), select("s1"), removeSource("s2"))
        expect(state.selectedIds).toEqual(["s1"])
    })

    test("removeSource of a folder removes the sources inside it", () => {
        const state = run(
            addGeojson("s1"),
            addFolder({ id: "f", name: "F" }),
            move({ ids: ["s1"], parentId: "f", index: 0 }),
        )
        const next = reducer(state, removeSource("f"))
        expect(next.rootIds).toEqual([])
        expect(next.nodes).toEqual({})
        expect(next.items).toEqual({})
        expect(next.allIds).toEqual([])
    })

    test("setName updates name of source and its node", () => {
        const state = run(addGeojson("s1", "Old Name"), setName({ id: "s1", value: "New Name" }))
        expect(state.items.s1.name).toBe("New Name")
        expect(state.nodes.s1?.name).toBe("New Name")
    })

    test("setName renames a folder node", () => {
        const state = run(addFolder({ id: "f", name: "Old" }), setName({ id: "f", value: "New" }))
        expect(state.nodes.f?.name).toBe("New")
    })

    test("select sets selectedIds", () => {
        const state = run(addGeojson("s1"), select("s1"))
        expect(state.selectedIds).toEqual(["s1"])
    })

    test("select(undefined) clears selectedIds", () => {
        const state = run(addGeojson("s1"), select("s1"), select(undefined))
        expect(state.selectedIds).toEqual([])
    })

    test("setVisible toggles node visibility", () => {
        let state = run(addMvt("m", "pbf", roadsAndWater), setVisible({ id: "m/roads", value: false }))
        expect(state.nodes["m/roads"]?.visible).toBe(false)
        state = reducer(state, setVisible({ id: "m/roads", value: true }))
        expect(state.nodes["m/roads"]?.visible).toBe(true)
    })

    test("setExpanded adds and removes ids without duplicates", () => {
        let state = run(addMvt("m", "pbf", roadsAndWater), setExpanded({ id: "m", value: true }))
        expect(state.expandedIds).toEqual(["m"])
        state = reducer(state, setExpanded({ id: "m", value: false }))
        expect(state.expandedIds).toEqual([])
    })

    test("move reorders roots", () => {
        const state = run(addGeojson("s1"), addGeojson("s2"), addGeojson("s3"), move({ ids: ["s3"], index: 2 }))
        expect(state.rootIds).toEqual(["s2", "s1", "s3"])
    })

    test("move reorders children within their parent", () => {
        const state = run(addMvt("m", "pbf", roadsAndWater), move({ ids: ["m/water"], parentId: "m", index: 0 }))
        expect(state.nodes.m?.children).toEqual(["m/water", "m/roads"])
    })

    test("move of a child to root is a no-op", () => {
        const before = run(addMvt("m", "pbf", roadsAndWater))
        const state = reducer(before, move({ ids: ["m/roads"], index: 0 }))
        expect(state).toEqual(before)
    })

    test("move with empty ids is a no-op", () => {
        const before = run(addGeojson("s1"), addGeojson("s2"))
        const state = reducer(before, move({ ids: [], index: 0 }))
        expect(state).toEqual(before)
    })

    test("move of a root into a folder reparents it", () => {
        const state = run(
            addGeojson("s1"),
            addFolder({ id: "f", name: "F" }),
            move({ ids: ["s1"], parentId: "f", index: 0 }),
        )
        expect(state.rootIds).toEqual(["f"])
        expect(state.nodes.f?.children).toEqual(["s1"])
        expect(state.nodes.s1?.parentId).toBe("f")
    })

    test("addFolder under nothing creates a root folder at the top", () => {
        const state = run(addGeojson("s1"), addFolder({ id: "f", name: "Folder" }))
        expect(state.rootIds).toEqual(["f", "s1"])
        expect(state.nodes.f).toEqual({ id: "f", name: "Folder", kind: "folder", visible: true, children: [] })
        expect(state.items.f).toBeUndefined()
        expect(state.allIds).toEqual(["s1"])
    })

    test("addFolder under a parent adds it to the parent's children", () => {
        const state = run(addFolder({ id: "f", name: "F" }), addFolder({ id: "g", name: "G", parentId: "f" }))
        expect(state.rootIds).toEqual(["f"])
        expect(state.nodes.f?.children).toEqual(["g"])
        expect(state.nodes.g?.parentId).toBe("f")
    })

    test("addFolder under an unknown parent is a no-op", () => {
        const before = run(addGeojson("s1"))
        const state = reducer(before, addFolder({ id: "g", name: "G", parentId: "nope" }))
        expect(state).toEqual(before)
    })

    test("reset clears tree state", () => {
        const state = run(addMvt("m", "pbf", roadsAndWater), select("m"), reset())
        expect(state).toEqual(reducer(undefined, { type: "@@INIT" }))
    })
})

describe("makeSourceState", () => {
    test("matches the tree built by the reducer", () => {
        const geojson = makeGeojsonSource("s1")
        const vector = makeMvtSource("m", { sourceLayers: roadsAndWater })
        const raster = makeMvtSource("r", { format: "png", sourceLayers: roadsAndWater })
        const built = run(
            addRasterSource({ id: "r", name: raster.name, location: raster.location }),
            addMvt("m", "pbf", roadsAndWater),
            addGeojson("s1", geojson.name),
        )
        const fixture = makeSourceState([geojson, { ...vector, name: "MVT m" }, raster], { selectedIds: ["m"] })
        expect(fixture.nodes).toEqual(built.nodes)
        expect(fixture.rootIds).toEqual(built.rootIds)
        expect(fixture.expandedIds).toEqual(built.expandedIds)
        expect(fixture.selectedIds).toEqual(["m"])
        expect(fixture.items.m).toEqual({ ...vector, name: "MVT m" })
    })
})

describe("sourceSlice selectors", () => {
    test("items returns items map", () => {
        const sourceState = makeSourceState([makeGeojsonSource("s1")])
        expect(items(makeRootState(sourceState))).toEqual(sourceState.items)
    })

    test("allIds returns id array", () => {
        const sourceState = makeSourceState([makeGeojsonSource("s1"), makeGeojsonSource("s2")])
        expect(allIds(makeRootState(sourceState))).toEqual(["s1", "s2"])
    })

    test("tree selectors return tree fields", () => {
        const sourceState = makeSourceState([makeMvtSource("m", { sourceLayers: roadsAndWater })])
        const state = makeRootState(sourceState)
        expect(nodes(state)).toEqual(sourceState.nodes)
        expect(rootIds(state)).toEqual(["m"])
        expect(expandedIds(state)).toEqual(["m"])
    })

    test("selectSelectedId returns undefined initially", () => {
        const sourceState = makeSourceState([])
        expect(selectSelectedId(makeRootState(sourceState))).toBeUndefined()
        expect(selectSelectedIds(makeRootState(sourceState))).toEqual([])
    })

    test("selectSelectedId returns the first selected node id", () => {
        const sourceState = makeSourceState([makeGeojsonSource("s1")], { selectedIds: ["s1"] })
        expect(selectSelectedId(makeRootState(sourceState))).toBe("s1")
        expect(selectSelectedIds(makeRootState(sourceState))).toEqual(["s1"])
    })
})
