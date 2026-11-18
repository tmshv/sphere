import type { RasterTemplateResult } from "@/types/raster-template"
import { WEB_MERCATOR_CRS } from "./projection"

const XYZ_TOKENS = ["{z}", "{x}", "{y}"]
// MapLibre fills it with the tile bbox in EPSG:3857 whatever the map projection is
const BBOX_3857_TOKEN = "{bbox-epsg-3857}"
// MapLibre fills it with the tile bbox in the CRS of the map projection
const BBOX_TOKEN = "{bbox}"
const HTTP_PROTOCOLS = ["http:", "https:"]

const XYZ_TILE_SIZE = 256
// The common deepest zoom of XYZ tile servers, OpenStreetMap's among them
const XYZ_MAXZOOM = 19
// A WMS server renders any scale; this is as deep as MapLibre usefully goes
const WMS_MAXZOOM = 22

const POSITIVE_INTEGER = /^[1-9]\d*$/

export const TEMPLATE_ERRORS = {
    empty: "Enter a URL template",
    invalidUrl: "Not a valid URL",
    protocol: "URL must start with http:// or https://",
    noToken: "Template needs a tile token: {z}/{x}/{y}, {bbox-epsg-3857} or {bbox}",
    mixedTokens: "Template mixes XYZ and WMS tile tokens",
    noCrs: "WMS template has no SRS or CRS parameter",
    noSize: "WMS template needs WIDTH and HEIGHT",
    badSize: "WMS WIDTH and HEIGHT must be equal positive integers",
    bbox3857: `${BBOX_3857_TOKEN} works only with ${WEB_MERCATOR_CRS}, use ${BBOX_TOKEN}`,
}

// Looks a query parameter up by name, ignoring case, as WMS servers do
function param(params: URLSearchParams, name: string): string | undefined {
    const upper = name.toUpperCase()
    for (const [key, value] of params) {
        if (key.toUpperCase() === upper) {
            return value
        }
    }
    return undefined
}

/**
 * Validates an XYZ or WMS GetMap URL template against the CRS of the map projection and builds raster tiles from it.
 * The template is kept as typed: `URL` would percent-encode the `{` and `}` of path tokens.
 */
export function parseRasterTemplate(input: string, crs: string): RasterTemplateResult {
    const template = input.trim()
    if (!template) {
        return { error: TEMPLATE_ERRORS.empty }
    }
    if (!URL.canParse(template)) {
        return { error: TEMPLATE_ERRORS.invalidUrl }
    }
    const url = new URL(template)
    if (!HTTP_PROTOCOLS.includes(url.protocol)) {
        return { error: TEMPLATE_ERRORS.protocol }
    }

    const isXyz = XYZ_TOKENS.every(token => template.includes(token))
    const has3857Bbox = template.includes(BBOX_3857_TOKEN)
    const isWms = has3857Bbox || template.includes(BBOX_TOKEN)
    if (isXyz && isWms) {
        return { error: TEMPLATE_ERRORS.mixedTokens }
    }

    if (isXyz) {
        if (crs !== WEB_MERCATOR_CRS) {
            return { error: `XYZ tiles are ${WEB_MERCATOR_CRS}, the map is ${crs}` }
        }
        return {
            kind: "xyz",
            name: url.host,
            tiles: { urls: [template], tileSize: XYZ_TILE_SIZE, maxzoom: XYZ_MAXZOOM, attribution: "" },
        }
    }

    if (!isWms) {
        return { error: TEMPLATE_ERRORS.noToken }
    }

    const params = url.searchParams
    // WMS 1.1.1 names it SRS, 1.3.0 names it CRS
    const templateCrs = param(params, "SRS") ?? param(params, "CRS")
    if (!templateCrs) {
        return { error: TEMPLATE_ERRORS.noCrs }
    }
    if (templateCrs.toUpperCase() !== crs.toUpperCase()) {
        return { error: `WMS template is in ${templateCrs}, the map is ${crs}` }
    }
    if (has3857Bbox && crs !== WEB_MERCATOR_CRS) {
        return { error: TEMPLATE_ERRORS.bbox3857 }
    }

    const width = param(params, "WIDTH")
    const height = param(params, "HEIGHT")
    if (width === undefined || height === undefined) {
        return { error: TEMPLATE_ERRORS.noSize }
    }
    if (width !== height || !POSITIVE_INTEGER.test(width)) {
        return { error: TEMPLATE_ERRORS.badSize }
    }

    const layers = param(params, "LAYERS")
    return {
        kind: "wms",
        name: layers ? `${url.host}/${layers}` : url.host,
        tiles: { urls: [template], tileSize: Number(width), maxzoom: WMS_MAXZOOM, attribution: "" },
    }
}
