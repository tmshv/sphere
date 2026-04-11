import { SourceType } from "@/types"
import { configureStore } from "@reduxjs/toolkit"
import { type MockInstance, beforeEach, describe, expect, test, vi } from "vitest"

const makeStore = () => configureStore({ reducer: (state: Record<string, never> = {}) => state })

vi.mock("@tauri-apps/api/path", () => ({
    extname: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: vi.fn(),
}))

vi.mock("../source", () => ({
    actions: {
        addFromUrl: vi.fn().mockReturnValue({ type: "source/addFromUrl" }),
    },
}))

vi.mock("../mapStyle", () => ({
    actions: {
        setMapStyle: vi.fn().mockImplementation((payload: unknown) => ({
            type: "mapStyle/setMapStyle",
            payload,
        })),
    },
}))

import { extname } from "@tauri-apps/api/path"
import { readTextFile } from "@tauri-apps/plugin-fs"
import { actions as mapStyleActions } from "../mapStyle"
import { actions as sourceActions } from "../source"
import addFile from "./add-file"

const mockExtname = vi.mocked(extname)
const mockReadTextFile = vi.mocked(readTextFile)
const mockAddFromUrl = vi.mocked(sourceActions.addFromUrl)
const mockSetMapStyle = vi.mocked(mapStyleActions.setMapStyle)

describe("addFile thunk", () => {
    let store: ReturnType<typeof makeStore>
    let dispatchSpy: MockInstance

    beforeEach(() => {
        vi.clearAllMocks()
        store = makeStore()
        dispatchSpy = vi.spyOn(store, "dispatch")
    })

    test(".json ext reads file and dispatches setMapStyle with parsed JSON", async () => {
        const styleData = { version: 8, sources: {}, layers: [] }
        mockExtname.mockResolvedValue("json")
        mockReadTextFile.mockResolvedValue(JSON.stringify(styleData))

        await addFile("/path/to/style.json")(store.dispatch, store.getState, undefined)

        expect(mockSetMapStyle).toHaveBeenCalledWith(styleData)
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: "mapStyle/setMapStyle", payload: styleData }),
        )
    })

    test(".JSON ext (uppercase) is lowercased and treated as json", async () => {
        const styleData = { version: 8, sources: {}, layers: [] }
        mockExtname.mockResolvedValue("JSON")
        mockReadTextFile.mockResolvedValue(JSON.stringify(styleData))

        await addFile("/path/to/style.JSON")(store.dispatch, store.getState, undefined)

        expect(mockSetMapStyle).toHaveBeenCalledWith(styleData)
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: "mapStyle/setMapStyle", payload: styleData }),
        )
    })

    test(".mbtiles ext dispatches addFromUrl with MVT type and mbtiles URL", async () => {
        mockExtname.mockResolvedValue("mbtiles")

        await addFile("/path/to/data.mbtiles")(store.dispatch, store.getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "file:///path/to/data.mbtiles",
            type: SourceType.MVT,
        })
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "source/addFromUrl" }))
    })

    test("unknown ext dispatches addFromUrl with Geojson type and source URL", async () => {
        mockExtname.mockResolvedValue("geojson")

        await addFile("/path/to/data.geojson")(store.dispatch, store.getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "file:///path/to/data.geojson",
            type: SourceType.Geojson,
        })
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "source/addFromUrl" }))
    })

    test("shp ext dispatches addFromUrl with Geojson type", async () => {
        mockExtname.mockResolvedValue("shp")

        await addFile("/data/shape.shp")(store.dispatch, store.getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "file:///data/shape.shp",
            type: SourceType.Geojson,
        })
    })

    test("csv ext dispatches addFromUrl with Geojson type", async () => {
        mockExtname.mockResolvedValue("csv")

        await addFile("/data/table.csv")(store.dispatch, store.getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "file:///data/table.csv",
            type: SourceType.Geojson,
        })
    })

    test("empty extension falls through to default and dispatches addFromUrl with Geojson type", async () => {
        mockExtname.mockResolvedValue("")

        await addFile("/data/noextension")(store.dispatch, store.getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "file:///data/noextension",
            type: SourceType.Geojson,
        })
        expect(mockSetMapStyle).not.toHaveBeenCalled()
    })

    test(".json ext with invalid JSON does not dispatch anything", async () => {
        mockExtname.mockResolvedValue("json")
        mockReadTextFile.mockResolvedValue("not valid json{{{")

        await addFile("/path/to/bad.json")(store.dispatch, store.getState, undefined)

        expect(mockSetMapStyle).not.toHaveBeenCalled()
        expect(mockAddFromUrl).not.toHaveBeenCalled()
    })

    test(".json ext with GeoJSON FeatureCollection does not dispatch setMapStyle", async () => {
        const geoJSON = { type: "FeatureCollection", features: [] }
        mockExtname.mockResolvedValue("json")
        mockReadTextFile.mockResolvedValue(JSON.stringify(geoJSON))

        await addFile("/path/to/data.json")(store.dispatch, store.getState, undefined)

        expect(mockSetMapStyle).not.toHaveBeenCalled()
    })

    test(".json ext with partial style (missing sources) does not dispatch setMapStyle", async () => {
        const partialStyle = { version: 8, layers: [] }
        mockExtname.mockResolvedValue("json")
        mockReadTextFile.mockResolvedValue(JSON.stringify(partialStyle))

        await addFile("/path/to/style.json")(store.dispatch, store.getState, undefined)

        expect(mockSetMapStyle).not.toHaveBeenCalled()
    })
})
