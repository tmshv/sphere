import { describe, expect, it } from "vitest"
import { replaceState, splitSelectorList } from "./selector-list"

const ACTIVE = ":active"
const PINNED = "[data-pinned]"

describe("splitSelectorList", () => {
    it("splits on top-level commas only", () => {
        expect(splitSelectorList(".a:is(.b, .c), .d[x='1,2'] ,.e")).toEqual([".a:is(.b, .c)", ".d[x='1,2']", ".e"])
    })
})

describe("replaceState", () => {
    it("keeps only the selectors that style the state, with the state replaced", () => {
        expect(replaceState(".a:active:not(:disabled), .a[data-open], .b", ACTIVE, PINNED)).toEqual([
            ".a[data-pinned]:not(:disabled)",
        ])
    })

    it("skips a selector that styles the absence of the state", () => {
        expect(replaceState(".a:not(:active), .b:active", ACTIVE, PINNED)).toEqual([".b[data-pinned]"])
    })

    it("does not mistake a state attribute for the pseudo-class", () => {
        expect(replaceState(".a[data-active]", ACTIVE, PINNED)).toEqual([])
    })

    it("removes the state when the replacement is empty", () => {
        expect(replaceState(".a:active", ACTIVE, "")).toEqual([".a"])
    })
})
