import { describe, expect, it } from "vitest"
import type { Id, SourceNode, SourceNodes } from "@/types"
import {
    canMove,
    childLayerNodeId,
    collectSubtree,
    isEffectivelyVisible,
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
