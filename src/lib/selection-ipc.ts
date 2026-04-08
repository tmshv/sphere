import { invoke } from "@tauri-apps/api/core"
import type { PageResult } from "@/lib/source-reader"

export type SelectionDelta = {
    added: number[]
    removed: number[]
}

export function selectionSet(ids: number[]): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_set", { ids })
}

export function selectionAdd(ids: number[]): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_add", { ids })
}

export function selectionRemove(ids: number[]): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_remove", { ids })
}

export function selectionApply(): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_apply")
}

export function selectionClear(): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_clear")
}

export function selectionCount(): Promise<number> {
    return invoke<number>("selection_count")
}

export function selectionGetIds(): Promise<number[]> {
    return invoke<number[]>("selection_get_ids")
}

export function selectionQueryPage(
    sourceId: string,
    offset: number,
    limit: number,
    sortColumn?: string,
    sortAsc?: boolean,
): Promise<PageResult> {
    return invoke<PageResult>("selection_query_page", {
        sourceId,
        offset,
        limit,
        sortColumn,
        sortAsc,
    })
}

export type SelectionRectOp = "set" | "preview" | "add"

export function selectionRect(
    sourceId: string,
    bbox: [number, number, number, number],
    mode: "include" | "intersect",
    op: SelectionRectOp,
    generation: number,
): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_rect", {
        sourceId,
        bbox,
        mode,
        op,
        generation,
    })
}

export function selectionRectFeatures(
    featuresJson: string,
    bbox: [number, number, number, number],
    mode: string,
    op: SelectionRectOp,
    generation: number,
): Promise<SelectionDelta> {
    return invoke<SelectionDelta>("selection_rect_features", {
        featuresJson,
        bbox,
        mode,
        op,
        generation,
    })
}

export function selectionCacheFeatures(featuresJson: string): Promise<void> {
    return invoke("selection_cache_features", { featuresJson })
}
