import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import { type Id, SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import type { RootState } from "../index"
import {
    selectSelectedInteractive,
    selectSelectedNode,
    selectSelectedNodeActions,
    selectSelectedSourceId,
    selectSelectedSourceLayer,
    selectSelectedSourceRef,
} from "./tree-selectors"

const GEOJSON_ID = "g1"
const MVT_ID = "m1"
const FOLDER_ID = "f1"
const ROADS_LAYER = "roads"
const ROADS_NODE_ID = `${MVT_ID}/${ROADS_LAYER}`

const makeRootState = (source: object) => ({ source }) as unknown as RootState

function makeState(selectedId: Id | undefined, hiddenIds: Id[] = []) {
    const sources = [
        makeGeojsonSource(GEOJSON_ID),
        makeMvtSource(MVT_ID, { sourceLayers: [{ id: ROADS_LAYER, name: "Roads" }] }),
    ]
    return makeRootState(
        makeSourceState(sources, {
            folderIds: [FOLDER_ID],
            hiddenIds,
            selectedIds: selectedId === undefined ? [] : [selectedId],
        }),
    )
}

describe("selectSelectedSourceRef", () => {
    test("resolves a source node to its own id", () => {
        const state = makeState(GEOJSON_ID)

        expect(selectSelectedSourceRef(state)).toEqual({ nodeId: GEOJSON_ID, sourceId: GEOJSON_ID })
        expect(selectSelectedSourceId(state)).toBe(GEOJSON_ID)
        expect(selectSelectedSourceLayer(state)).toBeUndefined()
    })

    test("resolves a source-layer node to its parent id and its vector layer", () => {
        const state = makeState(ROADS_NODE_ID)

        expect(selectSelectedSourceRef(state)).toEqual({
            nodeId: ROADS_NODE_ID,
            sourceId: MVT_ID,
            sourceLayer: ROADS_LAYER,
        })
        expect(selectSelectedSourceId(state)).toBe(MVT_ID)
        expect(selectSelectedSourceLayer(state)).toBe(ROADS_LAYER)
    })

    test("resolves a folder to no data source", () => {
        const state = makeState(FOLDER_ID)

        expect(selectSelectedSourceRef(state)).toEqual({ nodeId: FOLDER_ID })
        expect(selectSelectedSourceId(state)).toBeUndefined()
        expect(selectSelectedSourceLayer(state)).toBeUndefined()
    })

    test("is undefined when nothing is selected", () => {
        const state = makeState(undefined)

        expect(selectSelectedSourceRef(state)).toBeUndefined()
        expect(selectSelectedSourceId(state)).toBeUndefined()
        expect(selectSelectedSourceLayer(state)).toBeUndefined()
    })

    test("returns the same reference for unchanged state", () => {
        const state = makeState(ROADS_NODE_ID)

        expect(selectSelectedSourceRef(state)).toBe(selectSelectedSourceRef(state))
    })
})

describe("selectSelectedNode", () => {
    test("returns the selected node", () => {
        const node = selectSelectedNode(makeState(ROADS_NODE_ID))

        expect(node?.id).toBe(ROADS_NODE_ID)
        expect(node?.kind).toBe("source-layer")
    })

    test("is undefined when nothing is selected", () => {
        expect(selectSelectedNode(makeState(undefined))).toBeUndefined()
    })
})

describe("selectSelectedInteractive", () => {
    test("is true for a visible root source", () => {
        expect(selectSelectedInteractive(makeState(GEOJSON_ID))).toBe(true)
    })

    test("is true for a visible child of a visible parent", () => {
        expect(selectSelectedInteractive(makeState(ROADS_NODE_ID))).toBe(true)
    })

    test("is false for a child whose parent is hidden", () => {
        const state = makeState(ROADS_NODE_ID, [MVT_ID])

        expect(selectSelectedInteractive(state)).toBe(false)
    })

    test("is false for a hidden root source", () => {
        const state = makeState(GEOJSON_ID, [GEOJSON_ID])

        expect(selectSelectedInteractive(state)).toBe(false)
    })

    test("is false for a folder", () => {
        expect(selectSelectedInteractive(makeState(FOLDER_ID))).toBe(false)
    })

    test("is false when nothing is selected", () => {
        expect(selectSelectedInteractive(makeState(undefined))).toBe(false)
    })
})

describe("selectSelectedNodeActions", () => {
    const CHILD_SOURCE_ID = "g2"
    const PENDING_ID = "fc-pending"

    // A folder holding a GeoJSON source, as KMZ archives will; no loader builds this yet
    function makeTreeState(selectedId: Id | undefined) {
        const sources = [
            makeGeojsonSource(GEOJSON_ID),
            makeGeojsonSource(CHILD_SOURCE_ID),
            makeMvtSource(MVT_ID, { sourceLayers: [{ id: ROADS_LAYER, name: "Roads" }] }),
            { id: PENDING_ID, name: "Pending", type: SourceType.FeatureCollection, editable: true, pending: true },
        ]
        const tree = makeSourceState(sources, {
            folderIds: [FOLDER_ID],
            selectedIds: selectedId === undefined ? [] : [selectedId],
        })
        const child = tree.nodes[CHILD_SOURCE_ID]
        const folder = tree.nodes[FOLDER_ID]
        if (!child || !folder) {
            throw new Error("fixture nodes missing")
        }
        return makeRootState({
            ...tree,
            nodes: {
                ...tree.nodes,
                [CHILD_SOURCE_ID]: { ...child, parentId: FOLDER_ID },
                [FOLDER_ID]: { ...folder, children: [CHILD_SOURCE_ID] },
            },
            rootIds: tree.rootIds.filter(id => id !== CHILD_SOURCE_ID),
        })
    }

    test("allows everything for a root GeoJSON source", () => {
        expect(selectSelectedNodeActions(makeTreeState(GEOJSON_ID))).toEqual({
            canZoom: true,
            canRemove: true,
            canShowProperties: true,
            canAddLayer: true,
        })
    })

    test("allows everything but properties for a root MVT source", () => {
        expect(selectSelectedNodeActions(makeTreeState(MVT_ID))).toEqual({
            canZoom: true,
            canRemove: true,
            canShowProperties: false,
            canAddLayer: true,
        })
    })

    test("disallows properties for a pending FeatureCollection source", () => {
        expect(selectSelectedNodeActions(makeTreeState(PENDING_ID)).canShowProperties).toBe(false)
    })

    test("disallows removing a child source on its own", () => {
        expect(selectSelectedNodeActions(makeTreeState(CHILD_SOURCE_ID))).toEqual({
            canZoom: true,
            canRemove: false,
            canShowProperties: true,
            canAddLayer: true,
        })
    })

    test("allows only zoom and add layer for a source-layer", () => {
        expect(selectSelectedNodeActions(makeTreeState(ROADS_NODE_ID))).toEqual({
            canZoom: true,
            canRemove: false,
            canShowProperties: false,
            canAddLayer: true,
        })
    })

    test("allows only remove for a root folder", () => {
        expect(selectSelectedNodeActions(makeTreeState(FOLDER_ID))).toEqual({
            canZoom: false,
            canRemove: true,
            canShowProperties: false,
            canAddLayer: false,
        })
    })

    test("allows nothing when nothing is selected", () => {
        expect(selectSelectedNodeActions(makeTreeState(undefined))).toEqual({
            canZoom: false,
            canRemove: false,
            canShowProperties: false,
            canAddLayer: false,
        })
    })

    test("returns the same reference for unchanged state", () => {
        const state = makeTreeState(ROADS_NODE_ID)

        expect(selectSelectedNodeActions(state)).toBe(selectSelectedNodeActions(state))
    })
})
