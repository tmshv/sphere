import "./style.css"

import { type ColumnStats, type PageResult, SourceReader } from "@/lib/source-reader"
import { selectionQueryPage } from "@/lib/selection-ipc"
import type { SourceMetadata } from "@/types"
import { Box, SegmentedControl, createStyles } from "@mantine/core"
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

const PAGE_SIZE = 50

const View: React.FC = () => {
    const [sourceId, setSourceId] = useState<string | null>(null)
    const [schema, setSchema] = useState<SourceMetadata | null>(null)
    const [filterExpression, setFilterExpression] = useState<unknown[] | null>(null)
    const [page, setPage] = useState<PageResult | null>(null)
    const [columnStats, setColumnStats] = useState<Record<string, ColumnStats>>({})
    const [sorting, setSorting] = useState<SortingState>([])
    const [pageIndex, setPageIndex] = useState(0)
    const [attributeFilter, setAttributeFilter] = useState<"all" | "selected">("all")
    const [selectionData, setSelectionData] = useState<{ sourceId: string; count: number } | null>(null)

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
        }).then(fn => {
            stop = fn
        })
        return () => {
            stop?.()
        }
    }, [])

    // Fetch column stats once per source
    useEffect(() => {
        if (!sourceId || !schema) return
        const reader = new SourceReader(sourceId)
        const cols = Object.keys(schema.columns)
        Promise.all(
            cols.map(async col => {
                const stats = await reader.getColumnStats(col)
                return [col, stats] as const
            }),
        )
            .then(entries => {
                const record: Record<string, ColumnStats> = {}
                for (const [col, stats] of entries) {
                    if (stats) record[col] = stats
                }
                setColumnStats(record)
            })
            .catch(() => {})
    }, [sourceId, schema])

    const isSelectionActive =
        attributeFilter === "selected" && selectionData !== null && selectionData.sourceId === sourceId

    // biome-ignore lint/correctness/useExhaustiveDependencies: selectionData must trigger refetch when selected features change while isSelectionActive stays true
    useEffect(() => {
        if (!sourceId) return
        const sortCol = sorting[0]?.id
        const sortAsc = sorting[0] ? !sorting[0].desc : undefined
        if (isSelectionActive) {
            selectionQueryPage(sourceId, pageIndex * PAGE_SIZE, PAGE_SIZE, sortCol, sortAsc)
                .then(result => {
                    setPage(result)
                })
                .catch(() => {})
            return
        }
        const reader = new SourceReader(sourceId)
        const filterJson = filterExpression ? JSON.stringify(filterExpression) : undefined
        reader
            .queryPage(pageIndex * PAGE_SIZE, PAGE_SIZE, sortCol, sortAsc, filterJson)
            .then(result => {
                if (result) setPage(result)
            })
            .catch(() => {})
    }, [sourceId, pageIndex, sorting, filterExpression, isSelectionActive, selectionData])

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
    const totalPages = Math.ceil(page.total_matching / PAGE_SIZE)

    return (
        <>
            <SegmentedControl
                size="xs"
                value={attributeFilter}
                onChange={v => {
                    if (v === "all" || v === "selected") {
                        setAttributeFilter(v)
                    }
                }}
                data={[
                    { label: "All", value: "all" },
                    { label: "Selected", value: "selected" },
                ]}
            />
            <PropertesTable
                columns={columns}
                meta={meta}
                data={rows}
                pageIndex={pageIndex}
                pageCount={totalPages}
                sorting={sorting}
                onPageChange={setPageIndex}
                onSortingChange={handleSortingChange}
            />
        </>
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
