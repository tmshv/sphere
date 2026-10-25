import { describe, expect, it } from "vitest"
import { type Id, type SourceNode, type SourceNodes, SourceType } from "@/types"
import {
    canMove,
    childLayerNodeId,
    collectSubtree,
    createSourceNodes,
    isEffectivelyVisible,
    moveNodes,
    resolveSourceRef,
    siblingsOf,
    walkTree,
} from "./source-tree"

function node(partial: Partial<SourceNode> & { id: Id; kind: SourceNode["kind"] }): SourceNode {
    const base = { name: partial.id, visible: true, children: [], ...partial }
    if (base.kind === "source-layer") {
        return { ...base, kind: "source-layer", sourceLayer: partial.id }
    }
    return { ...base, kind: base.kind }
}

function toNodes(list: SourceNode[]): SourceNodes {
    return Object.fromEntries(list.map(n => [n.id, n]))
}

const tree = toNodes([
    node({ id: "root", kind: "source", children: ["a", "b"] }),
    node({ id: "a", kind: "source-layer", parentId: "root" }),
    node({ id: "b", kind: "source-layer", parentId: "root" }),
    node({ id: "r2", kind: "source", children: ["c"] }),
    node({ id: "c", kind: "source-layer", parentId: "r2" }),
    node({ id: "f", kind: "folder", children: ["g"] }),
    node({ id: "g", kind: "folder", parentId: "f" }),
])
const rootIds = ["root", "r2", "f"]

describe("childLayerNodeId", () => {
    it("joins parent id and layer", () => {
        expect(childLayerNodeId("abc", "land use")).toBe("abc/land use")
    })
})

describe("collectSubtree", () => {
    it("returns id then descendants depth-first", () => {
        expect(collectSubtree(tree, "root")).toEqual(["root", "a", "b"])
        expect(collectSubtree(tree, "f")).toEqual(["f", "g"])
    })
    it("returns empty for unknown id", () => {
        expect(collectSubtree(tree, "nope")).toEqual([])
    })
})

describe("isEffectivelyVisible", () => {
    it("is false when a parent is hidden", () => {
        const nodes = toNodes([
            node({ id: "p", kind: "source", visible: false, children: ["k"] }),
            node({ id: "k", kind: "source-layer", parentId: "p", visible: true }),
        ])
        expect(isEffectivelyVisible(nodes, "k")).toBe(false)
    })
    it("is true when all visible, false for unknown", () => {
        expect(isEffectivelyVisible(tree, "a")).toBe(true)
        expect(isEffectivelyVisible(tree, "nope")).toBe(false)
    })
})

describe("walkTree", () => {
    it("walks depth-first in order and skips unknown", () => {
        const ids = walkTree(tree, ["root", "nope", "r2"]).map(n => n.id)
        expect(ids).toEqual(["root", "a", "b", "r2", "c"])
    })
})

describe("canMove", () => {
    it("allows reorder within same parent", () => {
        expect(canMove(tree, rootIds, ["a"], "root", 1)).toBe(true)
        expect(canMove(tree, rootIds, ["root"], undefined, 2)).toBe(true)
    })
    it("rejects child to root or other parent", () => {
        expect(canMove(tree, rootIds, ["a"], undefined, 0)).toBe(false)
        expect(canMove(tree, rootIds, ["a"], "r2", 0)).toBe(false)
    })
    it("allows root into folder", () => {
        expect(canMove(tree, rootIds, ["root"], "f", 0)).toBe(true)
    })
    it("rejects folder into its own descendant or itself", () => {
        expect(canMove(tree, rootIds, ["f"], "g", 0)).toBe(false)
        expect(canMove(tree, rootIds, ["f"], "f", 0)).toBe(false)
    })
    it("rejects out-of-range index and unknown ids", () => {
        expect(canMove(tree, rootIds, ["a"], "root", 3)).toBe(false)
        expect(canMove(tree, rootIds, ["a"], "root", -1)).toBe(false)
        expect(canMove(tree, rootIds, ["nope"], undefined, 0)).toBe(false)
    })
})

describe("resolveSourceRef", () => {
    it("resolves each kind", () => {
        expect(resolveSourceRef(tree, "root")).toEqual({ nodeId: "root", sourceId: "root" })
        expect(resolveSourceRef(tree, "a")).toEqual({ nodeId: "a", sourceId: "root", sourceLayer: "a" })
        expect(resolveSourceRef(tree, "f")).toEqual({ nodeId: "f" })
    })
})

describe("siblingsOf", () => {
    it("returns ids sharing the parent including itself", () => {
        expect(siblingsOf(tree, rootIds, "a")).toEqual(["a", "b"])
        expect(siblingsOf(tree, rootIds, "r2")).toEqual(rootIds)
    })
})

describe("createSourceNodes", () => {
    it("creates a visible root without children for a non-MVT source", () => {
        const { root, children } = createSourceNodes({ id: "s1", name: "S1", type: SourceType.Geojson })
        expect(root).toEqual({ id: "s1", name: "S1", kind: "source", visible: true, children: [] })
        expect(children).toEqual([])
    })
    it("creates one visible source-layer child per vector layer, in order", () => {
        const { root, children } = createSourceNodes({
            id: "m",
            name: "M",
            type: SourceType.MVT,
            format: "pbf",
            sourceLayers: [
                { id: "roads", name: "Roads" },
                { id: "water", name: "Water" },
            ],
        })
        expect(root.children).toEqual(["m/roads", "m/water"])
        expect(children).toEqual([
            {
                id: "m/roads",
                name: "Roads",
                kind: "source-layer",
                sourceLayer: "roads",
                parentId: "m",
                visible: true,
                children: [],
            },
            {
                id: "m/water",
                name: "Water",
                kind: "source-layer",
                sourceLayer: "water",
                parentId: "m",
                visible: true,
                children: [],
            },
        ])
    })
    it("creates no children for a raster MVT source", () => {
        const { root, children } = createSourceNodes({
            id: "r",
            name: "R",
            type: SourceType.MVT,
            format: "png",
            sourceLayers: [{ id: "x", name: "x" }],
        })
        expect(root.children).toEqual([])
        expect(children).toEqual([])
    })
})

describe("moveNodes", () => {
    it("reorders roots using the post-removal index", () => {
        const next = moveNodes(tree, rootIds, ["root"], undefined, 2)
        expect(next.rootIds).toEqual(["r2", "f", "root"])
        expect(next.nodes).toEqual(tree)
    })
    it("keeps the given order of ids", () => {
        const next = moveNodes(tree, rootIds, ["f", "root"], undefined, 0)
        expect(next.rootIds).toEqual(["f", "root", "r2"])
    })
    it("reorders children of a parent", () => {
        const next = moveNodes(tree, rootIds, ["b"], "root", 0)
        expect(next.nodes.root?.children).toEqual(["b", "a"])
        expect(next.rootIds).toEqual(rootIds)
    })
    it("moves a root into a folder and sets its parent", () => {
        const next = moveNodes(tree, rootIds, ["r2"], "f", 1)
        expect(next.rootIds).toEqual(["root", "f"])
        expect(next.nodes.f?.children).toEqual(["g", "r2"])
        expect(next.nodes.r2?.parentId).toBe("f")
    })
    it("does not mutate its input", () => {
        const before = structuredClone(tree)
        moveNodes(tree, rootIds, ["r2"], "f", 0)
        expect(tree).toEqual(before)
        expect(rootIds).toEqual(["root", "r2", "f"])
    })
})
