import {
    buildColumnOptions,
    canApplyCsvGeometry,
    isStagedGeometryChanged,
    isStagedGeometryComplete,
    missingAppliedColumns,
    type StagedCsvGeometry,
    toCsvGeometryParams,
} from "./csv-geometry"

describe("isStagedGeometryComplete", () => {
    it("is incomplete for xy mode when only x is set", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "lon" }
        expect(isStagedGeometryComplete(staged)).toBe(false)
    })

    it("is incomplete for xy mode when only y is set", () => {
        const staged: StagedCsvGeometry = { mode: "xy", yColumn: "lat" }
        expect(isStagedGeometryComplete(staged)).toBe(false)
    })

    it("is complete for xy mode when both x and y are set", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(isStagedGeometryComplete(staged)).toBe(true)
    })

    it("is incomplete for wkt mode with no column", () => {
        const staged: StagedCsvGeometry = { mode: "wkt" }
        expect(isStagedGeometryComplete(staged)).toBe(false)
    })

    it("is complete for wkt mode with a column set", () => {
        const staged: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        expect(isStagedGeometryComplete(staged)).toBe(true)
    })
})

describe("isStagedGeometryChanged", () => {
    it("counts a mode switch as changed", () => {
        const staged: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(isStagedGeometryChanged(staged, applied)).toBe(true)
    })

    it("counts identical staged and applied as unchanged", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(isStagedGeometryChanged(staged, applied)).toBe(false)
    })

    it("counts a different wkt column as changed", () => {
        const staged: StagedCsvGeometry = { mode: "wkt", wktColumn: "geometry" }
        const applied: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        expect(isStagedGeometryChanged(staged, applied)).toBe(true)
    })

    it("counts a different x column as changed", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "longitude", yColumn: "lat" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(isStagedGeometryChanged(staged, applied)).toBe(true)
    })
})

describe("canApplyCsvGeometry", () => {
    it("is false when complete but unchanged", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(canApplyCsvGeometry(staged, applied)).toBe(false)
    })

    it("is true when complete and changed", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "longitude", yColumn: "latitude" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(canApplyCsvGeometry(staged, applied)).toBe(true)
    })

    it("is false when changed but incomplete", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "longitude" }
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(canApplyCsvGeometry(staged, applied)).toBe(false)
    })
})

describe("toCsvGeometryParams", () => {
    it("emits only the wkt column when the staged mode is wkt", () => {
        // The staged value the component actually produces after a mode switch:
        // the x/y columns the source was loaded with are still there.
        const staged: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom", xColumn: "lng", yColumn: "lat" }

        expect(toCsvGeometryParams(staged)).toEqual({ mode: "wkt", wktColumn: "geom" })
    })

    it("emits only the x/y pair when the staged mode is xy", () => {
        const staged: StagedCsvGeometry = { mode: "xy", wktColumn: "geom", xColumn: "lng", yColumn: "lat" }

        expect(toCsvGeometryParams(staged)).toEqual({ mode: "xy", xColumn: "lng", yColumn: "lat" })
    })

    it("keeps an incomplete staged value incomplete instead of inventing columns", () => {
        const staged: StagedCsvGeometry = { mode: "xy", xColumn: "lng" }

        expect(toCsvGeometryParams(staged)).toEqual({ mode: "xy", xColumn: "lng", yColumn: undefined })
    })
})

describe("buildColumnOptions", () => {
    it("returns the header columns when the applied columns are all present", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        const options = buildColumnOptions(["lon", "lat", "name"], applied, "xy")
        expect(options).toEqual(["lon", "lat", "name"])
    })

    it("appends an applied column absent from the header", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lng", yColumn: "lat" }
        const options = buildColumnOptions(["name"], applied, "xy")
        expect(options).toEqual(["name", "lng", "lat"])
    })

    it("does not duplicate an applied wkt column already in the header", () => {
        const applied: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        const options = buildColumnOptions(["geom", "name"], applied, "wkt")
        expect(options).toEqual(["geom", "name"])
    })

    it("does not offer a missing applied wkt column to the x/y pickers", () => {
        const applied: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        const options = buildColumnOptions(["name"], applied, "xy")
        expect(options).toEqual(["name"])
    })

    it("does not offer missing applied x/y columns to the wkt picker", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lng", yColumn: "lat" }
        const options = buildColumnOptions(["name"], applied, "wkt")
        expect(options).toEqual(["name"])
    })

    it("appends a missing applied column only once when x and y name the same column", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "coord", yColumn: "coord" }
        const options = buildColumnOptions(["name"], applied, "xy")
        expect(options).toEqual(["name", "coord"])
    })
})

describe("missingAppliedColumns", () => {
    it("returns an empty list when every applied column is in the header", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        expect(missingAppliedColumns(["lon", "lat"], applied)).toEqual([])
    })

    it("returns the applied columns absent from the header", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lng", yColumn: "lat" }
        expect(missingAppliedColumns(["name"], applied)).toEqual(["lng", "lat"])
    })

    it("ignores unset applied columns", () => {
        const applied: StagedCsvGeometry = { mode: "wkt" }
        expect(missingAppliedColumns(["name"], applied)).toEqual([])
    })
})
