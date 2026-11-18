import { nextColor } from "@sphere/utils"
import { fractionsBetween } from "@/lib/fraction-index"
import { nextId } from "@/lib/nextId"
import { LayerType } from "@/types"
import type { RasterTiles } from "@/types/source"
import type { Dispatch } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

export type RasterWithLayer = {
    // Prefix of the generated source id
    idPrefix: string
    name: string
    location: string
    tiles: RasterTiles
}

type ListenerApi = {
    dispatch: Dispatch
    getState: () => RootState
}

// Adds a web raster as a source with a raster layer of its own, drawn under every existing layer
export function addRasterWithLayer(
    { dispatch, getState }: ListenerApi,
    { idPrefix, name, location, tiles }: RasterWithLayer,
) {
    const sourceId = nextId(idPrefix)
    dispatch(actions.source.addRasterSource({ id: sourceId, name, location, tiles }))

    const { items } = getState().layer
    const lowest = Object.values(items).reduce<number | undefined>(
        (min, layer) => (min === undefined ? layer.fractionIndex : Math.min(min, layer.fractionIndex)),
        undefined,
    )
    const fractionIndex = fractionsBetween(undefined, lowest, 1).at(0) ?? 0
    dispatch(
        actions.layer.addLayer({
            id: nextId("layer"),
            sourceId,
            name,
            type: LayerType.Raster,
            visible: true,
            fractionIndex,
            color: nextColor(),
        }),
    )
}
