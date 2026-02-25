import { vi, describe, test, expect, beforeEach } from "vitest"
import { SourceType } from "@/types"

vi.mock("@tauri-apps/api/path", () => ({
    extname: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: vi.fn(),
}))

vi.mock("../source", () => ({
    actions: {
        addFromUrl: vi.fn(),
    },
}))

vi.mock("../mapStyle", () => ({
    actions: {
        setMapStyle: vi.fn(),
    },
}))

import { extname } from "@tauri-apps/api/path"
import { readTextFile } from "@tauri-apps/plugin-fs"
import { actions as sourceActions } from "../source"
import { actions as mapStyleActions } from "../mapStyle"
import addFile from "./add-file"

const mockExtname = vi.mocked(extname)
const mockReadTextFile = vi.mocked(readTextFile)
const mockAddFromUrl = vi.mocked(sourceActions.addFromUrl)
const mockSetMapStyle = vi.mocked(mapStyleActions.setMapStyle)

describe("addFile thunk", () => {
    let dispatch: ReturnType<typeof vi.fn>
    let getState: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        dispatch = vi.fn()
        getState = vi.fn().mockReturnValue({})
    })

    test(".json ext reads file and dispatches setMapStyle with parsed JSON", async () => {
        const styleData = { version: 8, layers: [] }
        mockExtname.mockResolvedValue("json")
        mockReadTextFile.mockResolvedValue(JSON.stringify(styleData))
        const mockAction = { type: "mapStyle/setMapStyle", payload: styleData }
        mockSetMapStyle.mockReturnValue(mockAction as any)

        await addFile("/path/to/style.json")(dispatch, getState, undefined)

        expect(mockSetMapStyle).toHaveBeenCalledWith(styleData)
        expect(dispatch).toHaveBeenCalledWith(mockAction)
    })

    test(".JSON ext (uppercase) is lowercased and treated as json", async () => {
        const styleData = { version: 8 }
        mockExtname.mockResolvedValue("JSON")
        mockReadTextFile.mockResolvedValue(JSON.stringify(styleData))
        const mockAction = { type: "mapStyle/setMapStyle", payload: styleData }
        mockSetMapStyle.mockReturnValue(mockAction as any)

        await addFile("/path/to/style.JSON")(dispatch, getState, undefined)

        expect(mockSetMapStyle).toHaveBeenCalledWith(styleData)
        expect(dispatch).toHaveBeenCalledWith(mockAction)
    })

    test(".mbtiles ext dispatches addFromUrl with MVT type and mbtiles URL", async () => {
        mockExtname.mockResolvedValue("mbtiles")
        const mockThunk = { type: "source/addFromUrl/thunk" }
        mockAddFromUrl.mockReturnValue(mockThunk as any)

        await addFile("/path/to/data.mbtiles")(dispatch, getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "sphere://mbtiles/path/to/data.mbtiles",
            type: SourceType.MVT,
        })
        expect(dispatch).toHaveBeenCalledWith(mockThunk)
    })

    test("unknown ext dispatches addFromUrl with Geojson type and source URL", async () => {
        mockExtname.mockResolvedValue("geojson")
        const mockThunk = { type: "source/addFromUrl/thunk" }
        mockAddFromUrl.mockReturnValue(mockThunk as any)

        await addFile("/path/to/data.geojson")(dispatch, getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "sphere://source/path/to/data.geojson",
            type: SourceType.Geojson,
        })
        expect(dispatch).toHaveBeenCalledWith(mockThunk)
    })

    test("shp ext dispatches addFromUrl with Geojson type", async () => {
        mockExtname.mockResolvedValue("shp")
        const mockThunk = { type: "source/addFromUrl/thunk" }
        mockAddFromUrl.mockReturnValue(mockThunk as any)

        await addFile("/data/shape.shp")(dispatch, getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "sphere://source/data/shape.shp",
            type: SourceType.Geojson,
        })
    })

    test("csv ext dispatches addFromUrl with Geojson type", async () => {
        mockExtname.mockResolvedValue("csv")
        const mockThunk = { type: "source/addFromUrl/thunk" }
        mockAddFromUrl.mockReturnValue(mockThunk as any)

        await addFile("/data/table.csv")(dispatch, getState, undefined)

        expect(mockAddFromUrl).toHaveBeenCalledWith({
            url: "sphere://source/data/table.csv",
            type: SourceType.Geojson,
        })
    })
})
