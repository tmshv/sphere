import { tableu10 } from "@/lib/color-scheme"
import { type LayerRenderType, SourceType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from "."
import { selectActiveSidebarTab } from "./app"

const PREVIEW_COLOR = tableu10[0]
const PREVIEW_RADIUS = 3

export type PreviewLayerSpec =
    | {
          kind: Extract<LayerRenderType, "Point">
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
          options: { minRadius: number; maxRadius: number }
      }
    | {
          kind: Extract<LayerRenderType, "LineString">
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
          thick: false
      }
    | {
          kind: Extract<LayerRenderType, "Polygon">
          layerId: string
          sourceId: string
          sourceLayer?: string
          color: string
      }

export const selectPreviewSourceId = createSelector(
    [(state: RootState) => state.selection.sourceId, (state: RootState) => state.source.items, selectActiveSidebarTab],
    (sourceId, items, tab) => {
        if (tab !== "sources") return undefined
        if (!sourceId) return undefined
        const src = items[sourceId]
        if (!src) return undefined
        if (src.type !== SourceType.Geojson && src.type !== SourceType.FeatureCollection && src.type !== SourceType.MVT)
            return undefined
        if (src.pending) return undefined
        return sourceId
    },
)

export const selectPreviewLayerSpecs = createSelector(
    [selectPreviewSourceId, (state: RootState) => state.source.items],
    (sourceId, items): PreviewLayerSpec[] => {
        if (!sourceId) return []
        const src = items[sourceId]
        if (!src) return []
        const opts = { minRadius: PREVIEW_RADIUS, maxRadius: PREVIEW_RADIUS }
        if (src.type === SourceType.Geojson || src.type === SourceType.FeatureCollection) {
            return [
                { kind: "Point", layerId: `preview-${sourceId}-point`, sourceId, color: PREVIEW_COLOR, options: opts },
                {
                    kind: "LineString",
                    layerId: `preview-${sourceId}-line`,
                    sourceId,
                    color: PREVIEW_COLOR,
                    thick: false,
                },
                { kind: "Polygon", layerId: `preview-${sourceId}-polygon`, sourceId, color: PREVIEW_COLOR },
            ]
        }
        if (src.type === SourceType.MVT) {
            return src.sourceLayers.flatMap(
                sl =>
                    [
                        {
                            kind: "Point",
                            layerId: `preview-${sourceId}-${sl.id}-point`,
                            sourceId,
                            sourceLayer: sl.id,
                            color: PREVIEW_COLOR,
                            options: opts,
                        },
                        {
                            kind: "LineString",
                            layerId: `preview-${sourceId}-${sl.id}-line`,
                            sourceId,
                            sourceLayer: sl.id,
                            color: PREVIEW_COLOR,
                            thick: false,
                        },
                        {
                            kind: "Polygon",
                            layerId: `preview-${sourceId}-${sl.id}-polygon`,
                            sourceId,
                            sourceLayer: sl.id,
                            color: PREVIEW_COLOR,
                        },
                    ] as PreviewLayerSpec[],
            )
        }
        return []
    },
)

export const selectPreviewLayerIds = createSelector(
    [(state: RootState) => state.selection.sourceId, (state: RootState) => state.source.items, selectActiveSidebarTab],
    (sourceId, items, tab): string[] => {
        if (tab !== "sources") return []
        if (!sourceId) return []
        const src = items[sourceId]
        if (!src) return []
        if (src.pending) return []
        if (src.type === SourceType.Geojson || src.type === SourceType.FeatureCollection) {
            return [
                `preview-${sourceId}-point`,
                `preview-${sourceId}-line-outline`,
                `preview-${sourceId}-line`,
                `preview-${sourceId}-polygon`,
                `preview-${sourceId}-polygon-outline-0`,
                `preview-${sourceId}-polygon-outline-1`,
            ]
        }
        if (src.type === SourceType.MVT) {
            return src.sourceLayers.flatMap(sl => [
                `preview-${sourceId}-${sl.id}-point`,
                `preview-${sourceId}-${sl.id}-line-outline`,
                `preview-${sourceId}-${sl.id}-line`,
                `preview-${sourceId}-${sl.id}-polygon`,
                `preview-${sourceId}-${sl.id}-polygon-outline-0`,
                `preview-${sourceId}-${sl.id}-polygon-outline-1`,
            ])
        }
        return []
    },
)
