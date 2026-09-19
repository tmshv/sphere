import type { CsvGeometryParams } from "@/lib/source-reader"
import type { Id } from "@/types"
import { createAction } from "@reduxjs/toolkit"

export type ApplyCsvGeometryPayload = CsvGeometryParams & { id: Id }

export const applyCsvGeometry = createAction<ApplyCsvGeometryPayload>("sourceInfo/applyCsvGeometry")
