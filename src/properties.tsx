import "./style.css"

import { type ColumnStats, type PageResult, SourceReader } from "@/lib/source-reader"
import { selectionGetIds, selectionQueryPage } from "@/lib/selection-ipc"
import type { SourceMetadata } from "@/types"
import { Box, createStyles } from "@mantine/core"
import { type ColumnDef, type SortingState, createColumnHelper } from "@tanstack/react-table"
import { type UnlistenFn, emit, listen } from "@tauri-apps/api/event"
import React, { useEffect, useState, useCallback } from "react"
import ReactDOM from "react-dom/client"
import { PropertesTable, type PropertyItem, type PropertyItemMeta } from "./ui/PropertiesTable"
import { ThemeProvider } from "./ui/ThemeProvider"

type PropertiesSetPayload = {
    sourceId: string
    schema: SourceMetadata
    filterExpression: unknown[] | null
}

const useStyle = createStyles(() => ({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
    },
}))

const columnHelper = createColumnHelper<PropertyItem>()

function schemaToMeta(
    columns: Record<string, string>,
    columnStats: Record<string, ColumnStats>,
): Record<string, PropertyItemMeta> {
    const meta: Record<string, PropertyItemMeta> = {
        $id: { type: "unknown" },
    }
    for (const [key, colType] of Object.entries(columns)) {
        const stats = columnStats[key]
        const lower = colType.toLowerCase()
        if (lower === "number" || lower === "int" || lower === "integer") {
            meta[key] = {
                type: "int",
                min: stats?.min,
                max: stats?.max,
                mean: stats?.mean,
                hist: stats?.histogram?.map(b => b.count),
            }
        } else if (lower === "float" || lower === "real" || lower === "double") {
            meta[key] = {
                type: "float",
                min: stats?.min,
                max: stats?.max,
                mean: stats?.mean,
                hist: stats?.histogram?.map(b => b.count),
            }
        } else {
            meta[key] = { type: "string", unique: stats?.unique_count ?? 0 }
        }
    }
    return meta
}

function buildColumns(columnNames: string[]): ColumnDef<PropertyItem>[] {
    return [
        columnHelper.accessor("$id", {
            id: "$id",
            cell: info => info.getValue(),
            header: () => <span>$id</span>,
        }),
        ...columnNames.map(key =>
            columnHelper.accessor(key, {
                id: key,
                cell: info => info.getValue(),
                header: () => <span>{key}</span>,
            }),
        ),
    ]
}

const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000].map(n => ({
    value: String(n),
    label: `${n} per page`,
}))
const DEFAULT_PAGE_SIZE = 50

const View: React.FC = () => {
    const [sourceId, setSourceId] = useState<string | null>(null)
    const [schema, setSchema] = useState<SourceMetadata | null>(null)
    const [filterExpression, setFilterExpression] = useState<unknown[] | null>(null)
    const [page, setPage] = useState<PageResult | null>(null)
    const [columnStats, setColumnStats] = useState<Record<string, ColumnStats>>({})
    const [sorting, setSorting] = useState<SortingState>([])
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [pageIndex, setPageIndex] = useState(0)
    const [attributeFilter, setAttributeFilter] = useState<"all" | "selection">("all")
    const [selectionData, setSelectionData] = useState<{ sourceId: string; count: number } | null>(null)
    const [selectionVersion, setSelectionVersion] = useState(0)

    // Listen for source info from the main window
    useEffect(() => {
        let stop: UnlistenFn | undefined
        listen<PropertiesSetPayload>("properties-set", event => {
            setSourceId(event.payload.sourceId)
            setSchema(event.payload.schema)
            setFilterExpression(event.payload.filterExpression)
            setPageIndex(0)
            setSorting([])
        }).then(fn => {
            stop = fn
        })
        return () => {
            stop?.()
        }
    }, [])

    // Listen for selection changes from the main window
    useEffect(() => {
        let stop: UnlistenFn | undefined
        listen<{ sourceId: string; count: number }>("properties-selection-changed", event => {
            setSelectionData(event.payload)
            setSelectionVersion(v => v + 1)
        }).then(fn => {
            stop = fn
        })
        return () => {
            stop?.()
        }
    }, [])

    const isSelectionActive = attributeFilter === "selection" && selectionData !== null && selectionData.count > 0

    // Fetch column stats — for all features when filter=All, or only selected features when
    // filter=Selection. Refetches whenever the selection changes (selectionVersion bump).
    useEffect(() => {
        if (!sourceId || !schema) return
        let cancelled = false
        const cols = Object.keys(schema.columns)
        const reader = new SourceReader(sourceId)

        const run = async () => {
            const ids = isSelectionActive ? await selectionGetIds() : undefined
            const entries = await Promise.all(
                cols.map(async col => {
                    const stats = await reader.getColumnStats(col, ids)
                    return [col, stats] as const
                }),
            )
            if (cancelled) return
            const record: Record<string, ColumnStats> = {}
            for (const [col, stats] of entries) {
                if (stats) record[col] = stats
            }
            setColumnStats(record)
        }

        run().catch(() => {})
        return () => {
            cancelled = true
        }
    }, [sourceId, schema, isSelectionActive, selectionVersion])

    // Fetch page when not viewing selection
    useEffect(() => {
        if (!sourceId || isSelectionActive) return
        if (attributeFilter === "selection") {
            setPage({ features: [], total_matching: 0, offset: 0, limit: pageSize })
            return
        }
        const sortCol = sorting[0]?.id
        const sortAsc = sorting[0] ? !sorting[0].desc : undefined
        const reader = new SourceReader(sourceId)
        const filterJson = filterExpression ? JSON.stringify(filterExpression) : undefined
        reader
            .queryPage(pageIndex * pageSize, pageSize, sortCol, sortAsc, filterJson)
            .then(result => {
                if (result) setPage(result)
            })
            .catch(() => {})
    }, [sourceId, pageIndex, pageSize, sorting, filterExpression, isSelectionActive, attributeFilter])

    // Fetch selection page; selectionVersion drives refetch when selected features change
    useEffect(() => {
        if (!sourceId || !isSelectionActive || selectionVersion === 0) return
        const sortCol = sorting[0]?.id
        const sortAsc = sorting[0] ? !sorting[0].desc : undefined
        selectionQueryPage(sourceId, pageIndex * pageSize, pageSize, sortCol, sortAsc)
            .then(result => {
                setPage(result)
            })
            .catch(() => {})
    }, [sourceId, pageIndex, pageSize, sorting, isSelectionActive, selectionVersion])

    const handlePageSizeChange = useCallback((size: number) => {
        setPageSize(size)
        setPageIndex(0)
    }, [])

    const handleAttributeFilterChange = useCallback((value: "all" | "selection") => {
        setAttributeFilter(value)
        setPageIndex(0)
    }, [])

    const handleSortingChange = useCallback((updater: SortingState | ((prev: SortingState) => SortingState)) => {
        setSorting(prev => {
            const next = typeof updater === "function" ? updater(prev) : updater
            setPageIndex(0)
            return next
        })
    }, [])

    if (!sourceId || !schema || !page) {
        return null
    }

    const columnNames = Object.keys(schema.columns)
    const columns = buildColumns(columnNames)
    const meta = schemaToMeta(schema.columns, columnStats)

    const rows: PropertyItem[] = page.features.map(f => ({ $id: f.id, ...f.properties }))
    const totalPages = Math.ceil(page.total_matching / pageSize)

    return (
        <PropertesTable
            columns={columns}
            meta={meta}
            data={rows}
            pageIndex={pageIndex}
            pageCount={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            attributeFilter={attributeFilter}
            sorting={sorting}
            onPageChange={setPageIndex}
            onPageSizeChange={handlePageSizeChange}
            onAttributeFilterChange={handleAttributeFilterChange}
            onSortingChange={handleSortingChange}
        />
    )
}

const App: React.FC = () => {
    const { classes: s } = useStyle()

    useEffect(() => {
        emit("properties-init", {})
    }, [])

    return (
        <Box className={s.container}>
            <View />
        </Box>
    )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider dark={false}>
            <App />
        </ThemeProvider>
    </React.StrictMode>,
)
