import type { DrawFeatureId } from "@/types"
import type { Bbox } from "@/types/bbox"
import { chooseWorkingSetScope, planWorkingSetUpdate, scopeAfterMove, touchedIds } from "./draw-working-set"

function feature(id: DrawFeatureId | undefined): GeoJSON.Feature {
    return { type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [1, 2] } }
}

const BBOX: Bbox = [0, 1, 2, 3]

describe("chooseWorkingSetScope", () => {
    test("uses the selection ids when the selection belongs to the source", () => {
        expect(
            chooseWorkingSetScope({ sourceId: "s1", selectionSourceId: "s1", selectionIds: [4, 5], bbox: BBOX }),
        ).toEqual({ type: "ids", ids: [4, 5] })
    })

    test("uses the viewport when the selection is empty", () => {
        expect(
            chooseWorkingSetScope({ sourceId: "s1", selectionSourceId: "s1", selectionIds: [], bbox: BBOX }),
        ).toEqual({ type: "bbox", bbox: BBOX })
    })

    test("uses the viewport when the selection belongs to another source", () => {
        expect(
            chooseWorkingSetScope({ sourceId: "s1", selectionSourceId: "s2", selectionIds: [4], bbox: BBOX }),
        ).toEqual({ type: "bbox", bbox: BBOX })
    })

    test("uses the viewport when the selection has no source", () => {
        expect(
            chooseWorkingSetScope({ sourceId: "s1", selectionSourceId: undefined, selectionIds: [4], bbox: BBOX }),
        ).toEqual({ type: "bbox", bbox: BBOX })
    })
})

describe("scopeAfterMove", () => {
    test("a viewport scope follows the map", () => {
        expect(scopeAfterMove({ type: "bbox", bbox: [9, 9, 9, 9] }, BBOX)).toEqual({ type: "bbox", bbox: BBOX })
    })

    test("a selection scope does not change", () => {
        expect(scopeAfterMove({ type: "ids", ids: [1] }, BBOX)).toBeUndefined()
    })

    test("nothing to follow before the first scope is known", () => {
        expect(scopeAfterMove(undefined, BBOX)).toBeUndefined()
    })
})

describe("touchedIds", () => {
    test("collects ids of features, deleted and created features", () => {
        expect(
            touchedIds({
                type: "draw.combine",
                deletedFeatures: [feature(1), feature(2)],
                createdFeatures: [feature("n1")],
            }),
        ).toEqual([1, 2, "n1"])
        expect(touchedIds({ type: "draw.update", features: [feature(0), feature("x")] })).toEqual([0, "x"])
    })

    test("skips features without an id", () => {
        expect(touchedIds({ type: "draw.delete", features: [feature(undefined), feature(3)] })).toEqual([3])
    })

    test("an event with no features touches nothing", () => {
        expect(touchedIds({ type: "draw.create" })).toEqual([])
    })
})

describe("planWorkingSetUpdate", () => {
    test("loads everything on first load", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set(),
            pinned: new Set(),
            incoming: [feature(1), feature(2)],
        })
        expect(plan.add).toEqual([feature(1), feature(2)])
        expect(plan.unload).toEqual([])
        expect([...plan.loaded]).toEqual([1, 2])
    })

    test("does not reload features already in draw", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set([1]),
            pinned: new Set(),
            incoming: [feature(1), feature(2)],
        })
        expect(plan.add).toEqual([feature(2)])
        expect([...plan.loaded].sort()).toEqual([1, 2])
    })

    test("never loads a pinned feature: edited, deleted or created ones keep their draw state", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set(),
            pinned: new Set([1, 7]),
            incoming: [feature(1), feature(2), feature(7)],
        })
        expect(plan.add).toEqual([feature(2)])
    })

    test("unloads untouched features that left the viewport", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set([1, 2, 3]),
            pinned: new Set(),
            incoming: [feature(2)],
        })
        expect(plan.unload).toEqual([1, 3])
        expect([...plan.loaded]).toEqual([2])
    })

    test("keeps pinned features loaded when they leave the viewport", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set([1, 2]),
            pinned: new Set([1]),
            incoming: [],
        })
        expect(plan.unload).toEqual([2])
        expect([...plan.loaded]).toEqual([1])
    })

    test("skips features draw cannot hold: no geometry or a GeometryCollection", () => {
        const empty: GeoJSON.Feature<GeoJSON.Geometry | null> = {
            type: "Feature",
            id: 1,
            properties: {},
            geometry: null,
        }
        const collection: GeoJSON.Feature = {
            type: "Feature",
            id: 2,
            properties: {},
            geometry: { type: "GeometryCollection", geometries: [] },
        }
        const plan = planWorkingSetUpdate({
            loaded: new Set(),
            pinned: new Set(),
            incoming: [empty, collection, feature(3)],
        })
        expect(plan.add).toEqual([feature(3)])
        expect([...plan.loaded]).toEqual([3])
    })

    test("skips incoming features without an id", () => {
        const plan = planWorkingSetUpdate({
            loaded: new Set(),
            pinned: new Set(),
            incoming: [feature(undefined), feature(0)],
        })
        expect(plan.add).toEqual([feature(0)])
    })
})
