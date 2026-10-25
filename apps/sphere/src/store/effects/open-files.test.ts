import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@tauri-apps/plugin-dialog", () => ({
    open: vi.fn(),
}))

vi.mock("./add-multiple-files", () => ({
    default: vi.fn((paths: string[]) => ({ type: "addMultipleFiles", payload: paths })),
}))

import { open } from "@tauri-apps/plugin-dialog"
import openFiles from "./open-files"

async function run() {
    const dispatch = vi.fn()
    await openFiles()(dispatch, () => ({}), undefined)
    return dispatch
}

describe("openFiles", () => {
    beforeEach(() => {
        vi.mocked(open).mockReset()
    })

    test.each([
        "csv",
        "geojson",
        "geojsonl",
        "json",
        "gpx",
        "kml",
        "kmz",
        "mbtiles",
        "shp",
    ])("offers .%s files in the dialog", async extension => {
        vi.mocked(open).mockResolvedValue(null)

        await run()

        expect(open).toHaveBeenCalledWith(
            expect.objectContaining({
                multiple: true,
                filters: [expect.objectContaining({ extensions: expect.arrayContaining([extension]) })],
            }),
        )
    })

    test("adds every selected file", async () => {
        vi.mocked(open).mockResolvedValue(["/a.kml", "/b.kmz"])

        const dispatch = await run()

        expect(dispatch).toHaveBeenCalledWith({ type: "addMultipleFiles", payload: ["/a.kml", "/b.kmz"] })
    })

    test("adds nothing when the dialog is cancelled", async () => {
        vi.mocked(open).mockResolvedValue(null)

        const dispatch = await run()

        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "addMultipleFiles" }))
    })
})
