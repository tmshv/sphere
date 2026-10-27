import { EMPTY_STYLE } from "@/const"
import { describe, expect, test } from "vitest"
import reducer, { actions } from "./mapStyle"

describe("mapStyle slice", () => {
    test("starts with an empty style, so basemaps come only from sources", () => {
        expect(reducer(undefined, { type: "@@init" }).value).toEqual(EMPTY_STYLE)
    })

    test("setMapStyle replaces the style", () => {
        const state = reducer(undefined, actions.setMapStyle("https://example.com/style.json"))
        expect(state.value).toBe("https://example.com/style.json")
    })
})
