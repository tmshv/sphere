import { type MockInstance, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
    writeText: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"

import { copySelectionAsGeojson, copySelectionAsWkt } from "./copy-selection"

const mockInvoke = invoke as unknown as MockInstance
const mockWriteText = writeText as unknown as MockInstance

beforeEach(() => {
    vi.clearAllMocks()
})

describe("copySelectionAsGeojson", () => {
    test("invokes selection_copy_geojson and writes to clipboard", async () => {
        const geojson = '{"type":"FeatureCollection","features":[]}'
        mockInvoke.mockResolvedValue(geojson)

        await copySelectionAsGeojson("source-1", true)

        expect(mockInvoke).toHaveBeenCalledWith("selection_copy_geojson", {
            sourceId: "source-1",
            wrapFc: true,
        })
        expect(mockWriteText).toHaveBeenCalledWith(geojson)
    })

    test("passes wrapFc=false to invoke", async () => {
        mockInvoke.mockResolvedValue('{"type":"Feature"}')

        await copySelectionAsGeojson("source-2", false)

        expect(mockInvoke).toHaveBeenCalledWith("selection_copy_geojson", {
            sourceId: "source-2",
            wrapFc: false,
        })
        expect(mockWriteText).toHaveBeenCalledWith('{"type":"Feature"}')
    })

    test("skips clipboard write when result is empty", async () => {
        mockInvoke.mockResolvedValue("")

        await copySelectionAsGeojson("source-1", true)

        expect(mockInvoke).toHaveBeenCalled()
        expect(mockWriteText).not.toHaveBeenCalled()
    })
})

describe("copySelectionAsWkt", () => {
    test("invokes selection_copy_wkt and writes to clipboard", async () => {
        const wkt = "POINT (1 2)\nPOINT (3 4)"
        mockInvoke.mockResolvedValue(wkt)

        await copySelectionAsWkt("source-1", "\n")

        expect(mockInvoke).toHaveBeenCalledWith("selection_copy_wkt", {
            sourceId: "source-1",
            separator: "\n",
        })
        expect(mockWriteText).toHaveBeenCalledWith(wkt)
    })

    test("uses custom separator", async () => {
        mockInvoke.mockResolvedValue("POINT (1 2);POINT (3 4)")

        await copySelectionAsWkt("source-1", ";")

        expect(mockInvoke).toHaveBeenCalledWith("selection_copy_wkt", {
            sourceId: "source-1",
            separator: ";",
        })
        expect(mockWriteText).toHaveBeenCalledWith("POINT (1 2);POINT (3 4)")
    })

    test("skips clipboard write when result is empty", async () => {
        mockInvoke.mockResolvedValue("")

        await copySelectionAsWkt("source-1", "\n")

        expect(mockInvoke).toHaveBeenCalled()
        expect(mockWriteText).not.toHaveBeenCalled()
    })
})
