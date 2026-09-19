import type { CsvGeometryParams, CsvMode } from "@/lib/source-reader"

export type StagedCsvGeometry = {
    mode: CsvMode
    wktColumn?: string
    xColumn?: string
    yColumn?: string
}

export function isStagedGeometryComplete(staged: StagedCsvGeometry): boolean {
    if (staged.mode === "wkt") {
        return Boolean(staged.wktColumn)
    }
    return Boolean(staged.xColumn) && Boolean(staged.yColumn)
}

export function isStagedGeometryChanged(staged: StagedCsvGeometry, applied: StagedCsvGeometry): boolean {
    if (staged.mode !== applied.mode) {
        return true
    }
    if (staged.mode === "wkt") {
        return staged.wktColumn !== applied.wktColumn
    }
    return staged.xColumn !== applied.xColumn || staged.yColumn !== applied.yColumn
}

export function canApplyCsvGeometry(staged: StagedCsvGeometry, applied: StagedCsvGeometry): boolean {
    return isStagedGeometryComplete(staged) && isStagedGeometryChanged(staged, applied)
}

// The staged value accumulates both modes' columns as the user switches back and
// forth, but the backend rejects a payload that carries the inactive mode's
// columns. Narrow it down to the mode actually being applied.
export function toCsvGeometryParams(staged: StagedCsvGeometry): CsvGeometryParams {
    if (staged.mode === "wkt") {
        return { mode: "wkt", wktColumn: staged.wktColumn }
    }
    return { mode: "xy", xColumn: staged.xColumn, yColumn: staged.yColumn }
}

function appliedColumnsForMode(applied: StagedCsvGeometry, mode: CsvMode): string[] {
    const columns = mode === "wkt" ? [applied.wktColumn] : [applied.xColumn, applied.yColumn]
    return columns.filter((column): column is string => Boolean(column))
}

// Options for one picker: the file's own header columns, plus any applied column
// that the file no longer has — but only the ones owned by that picker's mode, so
// a stale WKT column never shows up in the X/Y pickers.
export function buildColumnOptions(headerColumns: string[], applied: StagedCsvGeometry, mode: CsvMode): string[] {
    const missing = appliedColumnsForMode(applied, mode).filter(column => !headerColumns.includes(column))
    return [...headerColumns, ...missing.filter((column, index) => missing.indexOf(column) === index)]
}

export function missingAppliedColumns(headerColumns: string[], applied: StagedCsvGeometry): string[] {
    const appliedColumns = [applied.wktColumn, applied.xColumn, applied.yColumn].filter((column): column is string =>
        Boolean(column),
    )
    return appliedColumns.filter(column => !headerColumns.includes(column))
}
