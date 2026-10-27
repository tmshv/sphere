import { collectSubtree, isEffectivelyVisible, walkTree } from "@/lib/source-tree"
import type { Source } from "@/types/source"
import { type Id, type LayerRenderType, SourceType } from "@/types"
import { isRasterTileFormat } from "@/lib/tilejson"
import { lineStringLayerIds, polygonLayerIds } from "@/lib/maplibre"
import { assertUnreachable } from "@/lib"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { selectSelectedInteractive, selectSelectedNode } from "./source/tree-selectors"
import { selectActiveSidebarTab } from "./app"
import { PREVIEW_COLOR, PREVIEW_RADIUS } from "@/const"

export type PreviewLayerSpec =
    | {
          kind: Extract<LayerRenderType, "Point">
          nodeId: Id
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
          options: { minRadius: number; maxRadius: number }
      }
    | {
          kind: Extract<LayerRenderType, "LineString">
          nodeId: Id
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
          thick: false
      }
    | {
          kind: Extract<LayerRenderType, "Polygon">
          nodeId: Id
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
      }
    | {
          kind: "Raster"
          nodeId: Id
          layerId: string
          sourceId: string
      }

// Read slice fields directly: `sourceSlice` imports the tree selectors, so importing it here risks a cycle
const selectItems = (state: RootState) => state.source.items
const selectNodes = (state: RootState) => state.source.nodes
const selectRootIds = (state: RootState) => state.source.rootIds

const PREVIEW_OPTIONS = { minRadius: PREVIEW_RADIUS, maxRadius: PREVIEW_RADIUS }

function geometrySpecs(nodeId: Id, sourceId: Id, sourceLayer?: string): PreviewLayerSpec[] {
    const prefix = sourceLayer === undefined ? `preview-${sourceId}` : `preview-${sourceId}-${sourceLayer}`
    return [
        {
            kind: "Point",
            nodeId,
            layerId: `${prefix}-point`,
            sourceId,
            sourceLayer,
            color: PREVIEW_COLOR,
            options: PREVIEW_OPTIONS,
        },
        {
            kind: "LineString",
            nodeId,
            layerId: `${prefix}-line`,
            sourceId,
            sourceLayer,
            color: PREVIEW_COLOR,
            thick: false,
        },
        { kind: "Polygon", nodeId, layerId: `${prefix}-polygon`, sourceId, sourceLayer, color: PREVIEW_COLOR },
    ]
}

function sourceNodeSpecs(nodeId: Id, src: Source | undefined): PreviewLayerSpec[] {
    if (!src || src.pending) return []
    if (src.type === SourceType.Geojson || src.type === SourceType.FeatureCollection) {
        return geometrySpecs(nodeId, nodeId)
    }
    if (src.type === SourceType.Raster || (src.type === SourceType.MVT && isRasterTileFormat(src.format))) {
        return [{ kind: "Raster", nodeId, layerId: `preview-${nodeId}-raster`, sourceId: nodeId }]
    }
    return []
}

export const selectPreviewLayerSpecs = createSelector(
    [selectItems, selectNodes, selectRootIds, selectActiveSidebarTab],
    (items, nodes, rootIds, tab): PreviewLayerSpec[] => {
        if (tab !== "sources") return []
        const specs = walkTree(nodes, rootIds).flatMap((node): PreviewLayerSpec[] => {
            if (!isEffectivelyVisible(nodes, node.id)) return []
            if (node.kind === "source") return sourceNodeSpecs(node.id, items[node.id])
            if (node.kind === "source-layer" && node.parentId !== undefined) {
                const parent = items[node.parentId]
                if (!parent || parent.pending) return []
                return geometrySpecs(node.id, node.parentId, node.sourceLayer)
            }
            return []
        })
        // Tree top is rendered last, so it lands on top of the map
        return specs.reverse()
    },
)

/** Every MapLibre layer a spec draws, bottom to top */
function specMapLayerIds(spec: PreviewLayerSpec): string[] {
    switch (spec.kind) {
        case "Point":
        case "Raster":
            return [spec.layerId]
        case "LineString":
            return lineStringLayerIds(spec.layerId)
        case "Polygon":
            return polygonLayerIds(spec.layerId)
        default:
            return assertUnreachable(spec)
    }
}

export type PreviewLayerStackEntry = {
    spec: PreviewLayerSpec
    // Bottom MapLibre layer of the spec above; absent for the topmost spec
    beforeId?: string
}

/**
 * Specs in mount order, tree top first, each placed directly below the spec above it. Mounting top
 * first means a layer's `beforeId` names a layer rendered before it, so it is normally on the map already.
 */
export const selectPreviewLayerStack = createSelector([selectPreviewLayerSpecs], (specs): PreviewLayerStackEntry[] => {
    const topFirst = [...specs].reverse()
    return topFirst.map((spec, index) => {
        const above = index === 0 ? undefined : topFirst.at(index - 1)
        const beforeId = above === undefined ? undefined : specMapLayerIds(above).at(0)
        return { spec, beforeId }
    })
})

/** Every MapLibre layer of the preview, bottom to top */
export const selectPreviewDrawOrder = createSelector([selectPreviewLayerSpecs], (specs): string[] =>
    specs.flatMap(specMapLayerIds),
)

export const selectPreviewActive = createSelector([selectPreviewLayerSpecs], (specs): boolean => specs.length > 0)

export const selectPreviewLayerIds = createSelector(
    [selectPreviewLayerSpecs, selectNodes, selectSelectedNode, selectSelectedInteractive],
    (specs, nodes, node, interactive): string[] => {
        if (!node || !interactive) return []
        const subtree = new Set(collectSubtree(nodes, node.id))
        return specs.filter(spec => spec.kind !== "Raster" && subtree.has(spec.nodeId)).map(spec => spec.layerId)
    },
)
