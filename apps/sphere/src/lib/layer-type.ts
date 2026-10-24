import { LayerType } from "@/types"

const LAYER_TYPES: ReadonlyArray<unknown> = Object.values(LayerType)

export function isLayerType(value: unknown): value is LayerType {
    return LAYER_TYPES.includes(value)
}
