import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import type { RootState } from "../index"
import { selectSourceOutline, selectSourceTreeShape } from "./outline-selectors"

const MVT_ID = "m1"
const GEOJSON_ID = "g1"
const FOLDER_ID = "f1"
const ROADS_NODE_ID = `${MVT_ID}/roads`
const WATER_NODE_ID = `${MVT_ID}/water`

const makeRootState = (source: object) => ({ source }) as unknown as RootState

function makeState(hiddenIds: string[] = []) {
    const sources = [
        makeMvtSource(MVT_ID, {
            name: "Tiles",
            sourceLayers: [
                { id: "roads", name: "Roads" },
                { id: "water", name: "Water" },
            ],
        }),
        makeGeojsonSource(GEOJSON_ID, { name: "Points" }),
    ]
    return makeRootState(makeSourceState(sources, { folderIds: [FOLDER_ID], hiddenIds }))
}

describe("selectSourceOutline", () => {
    test("nests an MBTiles root's layers under it, in tree order", () => {
        expect(selectSourceOutline(makeState())).toEqual([
            {
                id: MVT_ID,
                label: "Tiles",
                kind: "source",
                sourceType: SourceType.MVT,
                visible: true,
                children: [
                    { id: ROADS_NODE_ID, label: "Roads", kind: "source-layer", visible: true, children: [] },
                    { id: WATER_NODE_ID, label: "Water", kind: "source-layer", visible: true, children: [] },
                ],
            },
            {
                id: GEOJSON_ID,
                label: "Points",
                kind: "source",
                sourceType: SourceType.Geojson,
                visible: true,
                children: [],
            },
            { id: FOLDER_ID, label: "Folder f1", kind: "folder", visible: true, children: [] },
        ])
    })

    test("copies each node's own visible flag", () => {
        const [root] = selectSourceOutline(makeState([MVT_ID, WATER_NODE_ID]))

        expect(root?.visible).toBe(false)
        expect(root?.children.map(child => child.visible)).toEqual([true, false])
    })

    test("follows a reordered rootIds", () => {
        const state = makeState()
        const reordered = makeRootState({ ...state.source, rootIds: [FOLDER_ID, GEOJSON_ID, MVT_ID] })

        expect(selectSourceOutline(reordered).map(node => node.id)).toEqual([FOLDER_ID, GEOJSON_ID, MVT_ID])
    })

    test("is empty without nodes", () => {
        expect(selectSourceOutline(makeRootState(makeSourceState([])))).toEqual([])
    })
})

describe("selectSourceTreeShape", () => {
    test("returns the slice's nodes and rootIds", () => {
        const state = makeState()

        expect(selectSourceTreeShape(state)).toEqual({ nodes: state.source.nodes, rootIds: state.source.rootIds })
    })

    test("keeps the same object while the tree is unchanged", () => {
        const state = makeState()

        expect(selectSourceTreeShape(state)).toBe(selectSourceTreeShape(state))
    })
})
