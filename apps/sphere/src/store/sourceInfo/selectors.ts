import type { FieldEntry, FieldSummary } from "@sphere/ui"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { selectCurrentSourceItem } from "../source"
import { sourceInfoSlice } from "."
import type { StatsEntry } from "."

function toSummary(entry: StatsEntry | undefined): FieldSummary {
    if (!entry || entry.status === "pending") {
        return { kind: "loading" }
    }
    if (entry.status === "error" || !entry.data) {
        return { kind: "error" }
    }
    const data = entry.data
    if (data.histogram) {
        return {
            kind: "numeric",
            min: data.min,
            max: data.max,
            mean: data.mean,
            histogram: data.histogram.map(bin => bin.count),
        }
    }
    return {
        kind: "string",
        unique: data.unique_count ?? 0,
        topValues: data.top_values ?? [],
    }
}

const selectStats = sourceInfoSlice.selectors.stats
const selectInfo = sourceInfoSlice.selectors.info
const selectSelectedId = (state: RootState) => state.source.selectedId

export const selectCurrentSourceInfo = createSelector([selectInfo, selectSelectedId], (info, id) =>
    id ? (info[id] ?? null) : null,
)

export const selectCurrentSourceMeta = createSelector([selectCurrentSourceItem], source => {
    if (!source || !("meta" in source) || !source.meta) {
        return null
    }
    return source.meta
})

export const selectCurrentSourceFields = createSelector(
    [selectCurrentSourceItem, selectStats, selectSelectedId],
    (source, stats, id): FieldEntry[] => {
        if (!source || !id || !("meta" in source) || !source.meta) {
            return []
        }
        const bySource = stats[id] ?? {}
        return Object.entries(source.meta.columns)
            .map(([name, type]) => {
                const entry = bySource[name]
                return {
                    name,
                    type,
                    nullCount: entry?.data?.null_count,
                    summary: toSummary(entry),
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))
    },
)
