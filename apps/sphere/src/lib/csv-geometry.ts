import type { CsvMode } from "@/lib/source-reader"

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

export function buildColumnOptions(headerColumns: string[], applied: StagedCsvGeometry): string[] {
    const missing = missingAppliedColumns(headerColumns, applied)
    return [...headerColumns, ...missing]
}

export function missingAppliedColumns(headerColumns: string[], applied: StagedCsvGeometry): string[] {
    const appliedColumns = [applied.wktColumn, applied.xColumn, applied.yColumn].filter((column): column is string =>
        Boolean(column),
    )
    return appliedColumns.filter(column => !headerColumns.includes(column))
}
