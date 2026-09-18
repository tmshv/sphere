import {
    buildColumnOptions,
    canApplyCsvGeometry,
    isStagedGeometryChanged,
    isStagedGeometryComplete,
    missingAppliedColumns,
    type StagedCsvGeometry,
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

describe("buildColumnOptions", () => {
    it("returns the header columns when the applied columns are all present", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lon", yColumn: "lat" }
        const options = buildColumnOptions(["lon", "lat", "name"], applied)
        expect(options).toEqual(["lon", "lat", "name"])
    })

    it("appends an applied column absent from the header", () => {
        const applied: StagedCsvGeometry = { mode: "xy", xColumn: "lng", yColumn: "lat" }
        const options = buildColumnOptions(["name"], applied)
        expect(options).toEqual(["name", "lng", "lat"])
    })

    it("does not duplicate an applied wkt column already in the header", () => {
        const applied: StagedCsvGeometry = { mode: "wkt", wktColumn: "geom" }
        const options = buildColumnOptions(["geom", "name"], applied)
        expect(options).toEqual(["geom", "name"])
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
