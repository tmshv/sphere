import { describe, expect, test } from "vitest"
import { WEB_MERCATOR_CRS } from "./projection"
import { parseRasterTemplate } from "./raster-template"

const LUX_CRS = "EPSG:2169"
const WMS_3857 =
    "https://wms.example.org/service?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=topomap&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png"
const WMS_LUX =
    "https://wms.geoportail.lu/opendata/service?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=topomap&STYLES=&SRS=EPSG:2169&BBOX={bbox}&WIDTH=512&HEIGHT=512&FORMAT=image/png"
const XYZ = "https://tile.example.org/{z}/{x}/{y}.png"

function errorOf(template: string, crs = WEB_MERCATOR_CRS) {
    const result = parseRasterTemplate(template, crs)
    return "error" in result ? result.error : undefined
}

describe("parseRasterTemplate", () => {
    test("parses an XYZ template", () => {
        expect(parseRasterTemplate(XYZ, WEB_MERCATOR_CRS)).toEqual({
            kind: "xyz",
            name: "tile.example.org",
            tiles: { urls: [XYZ], tileSize: 256, maxzoom: 19, attribution: "" },
        })
    })

    test("keeps the template as typed, without percent-encoding the tokens", () => {
        const result = parseRasterTemplate(`  ${XYZ}  `, WEB_MERCATOR_CRS)
        expect("tiles" in result && result.tiles.urls).toEqual([XYZ])
    })

    test("parses a WMS template with the EPSG:3857 bbox token", () => {
        expect(parseRasterTemplate(WMS_3857, WEB_MERCATOR_CRS)).toEqual({
            kind: "wms",
            name: "wms.example.org/topomap",
            tiles: { urls: [WMS_3857], tileSize: 256, maxzoom: 22, attribution: "" },
        })
    })

    test("parses a WMS template with the projection bbox token in its CRS", () => {
        const result = parseRasterTemplate(WMS_LUX, LUX_CRS)
        expect(result).toMatchObject({ kind: "wms", name: "wms.geoportail.lu/topomap", tiles: { tileSize: 512 } })
    })

    test("accepts the projection bbox token under Web Mercator", () => {
        const template = WMS_3857.replace("{bbox-epsg-3857}", "{bbox}")
        expect(errorOf(template)).toBeUndefined()
    })

    test("reads WMS 1.3.0 CRS and lower-case parameter names", () => {
        const template =
            "https://wms.example.org/?service=WMS&version=1.3.0&request=GetMap&layers=a,b&crs=epsg:3857&bbox={bbox-epsg-3857}&width=256&height=256"
        expect(parseRasterTemplate(template, WEB_MERCATOR_CRS)).toMatchObject({
            kind: "wms",
            name: "wms.example.org/a,b",
        })
    })

    test("names a WMS source by host when LAYERS is empty", () => {
        const template = WMS_3857.replace("LAYERS=topomap", "LAYERS=")
        expect(parseRasterTemplate(template, WEB_MERCATOR_CRS)).toMatchObject({ name: "wms.example.org" })
    })

    test("rejects an empty template", () => {
        expect(errorOf("   ")).toBe("Enter a URL template")
    })

    test("rejects text that is not a URL", () => {
        expect(errorOf("not a url {z}/{x}/{y}")).toBe("Not a valid URL")
    })

    test("rejects a non-http URL", () => {
        expect(errorOf("ftp://tile.example.org/{z}/{x}/{y}.png")).toBe("URL must start with http:// or https://")
    })

    test("rejects a template without a tile token", () => {
        expect(errorOf("https://tile.example.org/tile.png")).toBe(
            "Template needs a tile token: {z}/{x}/{y}, {bbox-epsg-3857} or {bbox}",
        )
    })

    test("rejects an XYZ template missing one of the tokens", () => {
        expect(errorOf("https://tile.example.org/{z}/{x}.png")).toBe(
            "Template needs a tile token: {z}/{x}/{y}, {bbox-epsg-3857} or {bbox}",
        )
    })

    test("rejects a template with both XYZ and bbox tokens", () => {
        expect(errorOf(`${XYZ}?BBOX={bbox}`)).toBe("Template mixes XYZ and WMS tile tokens")
    })

    test("rejects XYZ under a projection that is not Web Mercator", () => {
        expect(errorOf(XYZ, LUX_CRS)).toBe(`XYZ tiles are EPSG:3857, the map is ${LUX_CRS}`)
    })

    test("rejects WMS without SRS or CRS", () => {
        expect(errorOf(WMS_3857.replace("&SRS=EPSG:3857", ""))).toBe("WMS template has no SRS or CRS parameter")
    })

    test("rejects WMS whose SRS does not match the projection", () => {
        expect(errorOf(WMS_LUX)).toBe(`WMS template is in ${LUX_CRS}, the map is ${WEB_MERCATOR_CRS}`)
    })

    test("rejects the EPSG:3857 bbox token under another projection", () => {
        const template = WMS_LUX.replace("{bbox}", "{bbox-epsg-3857}")
        expect(errorOf(template, LUX_CRS)).toBe(`{bbox-epsg-3857} works only with EPSG:3857, use {bbox}`)
    })

    test("rejects WMS without WIDTH or HEIGHT", () => {
        expect(errorOf(WMS_3857.replace("&WIDTH=256", ""))).toBe("WMS template needs WIDTH and HEIGHT")
        expect(errorOf(WMS_3857.replace("&HEIGHT=256", ""))).toBe("WMS template needs WIDTH and HEIGHT")
    })

    test("rejects WMS with a non-square tile", () => {
        expect(errorOf(WMS_3857.replace("HEIGHT=256", "HEIGHT=512"))).toBe(
            "WMS WIDTH and HEIGHT must be equal positive integers",
        )
    })

    test("rejects WMS with a non-numeric tile size", () => {
        const template = WMS_3857.replace("WIDTH=256", "WIDTH=abc").replace("HEIGHT=256", "HEIGHT=abc")
        expect(errorOf(template)).toBe("WMS WIDTH and HEIGHT must be equal positive integers")
    })
})
