import type { RasterTiles } from "./source"

export type RasterTemplateKind = "xyz" | "wms"

export type RasterTemplate = {
    kind: RasterTemplateKind
    // Default source name, derived from the template
    name: string
    tiles: RasterTiles
}

export type RasterTemplateError = {
    error: string
}

export type RasterTemplateResult = RasterTemplate | RasterTemplateError
