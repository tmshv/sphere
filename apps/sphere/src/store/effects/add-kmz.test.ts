import { SourceType } from "@/types"
import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

vi.mock("../source", () => ({
    actions: {
        addFromUrl: vi.fn((payload: unknown) => ({ type: "source/addFromUrl", payload })),
        addFolder: vi.fn((payload: unknown) => ({ type: "source/addFolder", payload })),
        select: vi.fn((payload: unknown) => ({ type: "source/select", payload })),
    },
}))

import addKmz from "./add-kmz"

const ARCHIVE_URL = "file:///data/my%20backup.kmz"

async function run(path = "/data/my backup.kmz") {
    const dispatch = vi.fn()
    await addKmz(path)(dispatch, () => ({}), undefined)
    // Leave out the thunk's own pending/fulfilled lifecycle actions
    return dispatch.mock.calls
        .map(([action]) => action)
        .filter(action => !addKmz.fulfilled.match(action) && !addKmz.pending.match(action))
}

describe("addKmz", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
    })

    test("lists the documents of the archive", async () => {
        mockInvoke.mockResolvedValue([])

        await run()

        expect(mockInvoke).toHaveBeenCalledWith("kml_list_documents", { path: "/data/my backup.kmz" })
    })

    test("adds a folder for the archive and one child source per document, in archive order", async () => {
        mockInvoke.mockResolvedValue(["doc.kml", "files/My Places.kml"])

        const actions = await run()

        expect(actions).toEqual([
            { type: "source/addFolder", payload: { id: ARCHIVE_URL, name: "my backup" } },
            {
                type: "source/addFromUrl",
                payload: { url: `${ARCHIVE_URL}?entry=doc.kml`, type: SourceType.Geojson, parentId: ARCHIVE_URL },
            },
            {
                type: "source/addFromUrl",
                payload: {
                    url: `${ARCHIVE_URL}?entry=files%2FMy%20Places.kml`,
                    type: SourceType.Geojson,
                    parentId: ARCHIVE_URL,
                },
            },
            { type: "source/select", payload: ARCHIVE_URL },
        ])
    })

    test("adds a single-document archive as a plain source", async () => {
        mockInvoke.mockResolvedValue(["doc.kml"])

        const actions = await run()

        expect(actions).toEqual([
            { type: "source/addFromUrl", payload: { url: ARCHIVE_URL, type: SourceType.Geojson } },
        ])
    })

    test("adds a file that is not an archive as a plain source", async () => {
        mockInvoke.mockResolvedValue([])

        const actions = await run()

        expect(actions).toEqual([
            { type: "source/addFromUrl", payload: { url: ARCHIVE_URL, type: SourceType.Geojson } },
        ])
    })

    test("adds the file as a plain source when listing fails, so it fails like any other file", async () => {
        mockInvoke.mockRejectedValue("KML error in /data/my backup.kmz: invalid KMZ archive")

        const actions = await run()

        expect(actions).toEqual([
            { type: "source/addFromUrl", payload: { url: ARCHIVE_URL, type: SourceType.Geojson } },
        ])
    })
})
