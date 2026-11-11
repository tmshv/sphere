import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import type { RootState } from "."
import { type MenuContext, sameMenuContext, selectMenuContext } from "./menu"

const SOURCE_ID = "dem"

const demRaster = {
    id: SOURCE_ID,
    name: "Elevation",
    type: SourceType.Raster,
    location: "https://example.com/dem",
    editable: false as const,
    pending: false as const,
    dem: "terrarium" as const,
}

function makeState(sources: Parameters<typeof makeSourceState>[0]) {
    return {
        source: makeSourceState(sources),
        layer: { selectedId: undefined },
        selection: { count: 0, sourceId: undefined },
    } as unknown as RootState
}

const none: MenuContext = { hasSource: false, hasLayer: false, hasSelection: false, hasTerrainSource: false }

describe("selectMenuContext", () => {
    test("reports a terrain source when an elevation source exists", () => {
        expect(selectMenuContext(makeState([demRaster])).hasTerrainSource).toBe(true)
    })

    test("reports no terrain source for ordinary sources", () => {
        expect(selectMenuContext(makeState([makeGeojsonSource("a")])).hasTerrainSource).toBe(false)
    })
})

describe("sameMenuContext", () => {
    test("treats equal contexts as the same", () => {
        expect(sameMenuContext(none, { ...none })).toBe(true)
    })

    test("detects a change of hasTerrainSource", () => {
        expect(sameMenuContext(none, { ...none, hasTerrainSource: true })).toBe(false)
    })
})
