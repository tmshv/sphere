import "./style.css";

import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Table, Column, useReactTable, createColumnHelper, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table'
    ;// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' })// emit an event that are only visible to the current window
// appWindow.emit('event', { message: 'Tauri is awesome!' }) from "react-dom/client";
import { appWindow, WebviewWindow } from '@tauri-apps/api/window'
import { Box, createStyles, Pagination } from "@mantine/core";
import { ThemeProvider } from "./ui/ThemeProvider";

type PropertyItem = Record<string, any>

type FilterProps = {
    column: Column<PropertyItem>
    table: Table<PropertyItem>
}

const Filter: React.FC<FilterProps> = ({ column, table }) => {
    const firstValue = table
        .getPreFilteredRowModel()
        .flatRows[0]?.getValue(column.id)

    const columnFilterValue = column.getFilterValue()

    return typeof firstValue === 'number' ? (
        <div className="flex space-x-2">
            <input
                type="number"
                value={(columnFilterValue as [number, number])?.[0] ?? ''}
                onChange={e =>
                    column.setFilterValue((old: [number, number]) => [
                        e.target.value,
                        old?.[1],
                    ])
                }
                placeholder={`Min`}
                // className="w-24 border shadow rounded"
            />
            <input
                type="number"
                value={(columnFilterValue as [number, number])?.[1] ?? ''}
                onChange={e =>
                    column.setFilterValue((old: [number, number]) => [
                        old?.[0],
                        e.target.value,
                    ])
                }
                placeholder={`Max`}
                // className="w-24 border shadow rounded"
            />
        </div>
    ) : (
        <input
            type="text"
            value={(columnFilterValue ?? '') as string}
            onChange={e => column.setFilterValue(e.target.value)}
            placeholder={`Search...`}
            // className="w-36 border shadow rounded"
        />
    )
}

function useEvent<T>(eventName: string) {
    const [payload, setPayload] = useState<T | undefined>(undefined)

    useEffect(() => {
        let stop: UnlistenFn | undefined = undefined
        const fn = async () => {
            stop = await listen<T>(eventName, event => {
                setPayload(event.payload)
            })
        }

        fn()

        return () => {
            if (typeof stop === 'function') {
                stop()
            }
        }
    }, [])

    return payload
}

const useStyle = createStyles(theme => ({
    container: {
        overflowX: 'auto',
        height: '100%',

        userSelect: 'none',
        touchAction: 'none',
    },

    thead: {
        position: 'sticky',
        top: 0,
    },
    th: {
        position: 'relative',
    },
    resizer: {
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: 5,
        background: "rgba(0, 0, 0, 0.5);",
        cursor: "col-resize",
    },
    isResizing: {
        background: 'blue',
        opacity: 1,
    },
}))

const columnHelper = createColumnHelper<PropertyItem>()

type PropertiesSetPayload = {
    properties: PropertyItem[]
}

function useData(): [ColumnDef<PropertyItem>[], PropertyItem[]] | undefined {
    const data = useEvent<PropertiesSetPayload>("properties-set")
    if (!data) {
        return undefined
    }

    const head = Object.keys(data.properties[0])
    const columns = head.map(key => columnHelper.accessor(key, {
        id: key,
        cell: info => <i>{info.getValue()}</i>,
        header: () => <span>{key}</span>,
    }))
    // const columns = [
    // columnHelper.accessor('firstName', {
    //     cell: info => info.getValue(),
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor(row => row.lastName, {
    //     id: 'lastName',
    //     cell: info => <i>{info.getValue()}</i>,
    //     header: () => <span>Last Name</span>,
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('age', {
    //     header: () => 'Age',
    //     cell: info => info.renderValue(),
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('visits', {
    //     header: () => <span>Visits</span>,
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('status', {
    //     header: 'Status',
    //     footer: info => info.column.id,
    // }),
    // columnHelper.accessor('progress', {
    //     header: 'Profile Progress',
    //     footer: info => info.column.id,
    // }),
    // ]

    return [columns, data.properties]
}

const App: React.FC = () => {
    const { classes: s } = useStyle()

    useEffect(() => {
        emit("properties-init", { message: "lalala-" + Date.now() })
    }, [])

    return (
        <Box className={s.container}>
            <View />
        </Box>
    )
}

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
}

const PropertyTable: React.FC<PropertyTableProps> = ({ data, columns }) => {
    const { classes: s, cx } = useStyle()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const table = useReactTable({
        // columns: head,
        data,
        columns,
        columnResizeMode: 'onChange',
        getCoreRowModel: getCoreRowModel(),
        // getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <>
            <table
                {...{
                    style: {
                        width: table.getCenterTotalSize(),
                    },
                }}
            >
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr
                            key={headerGroup.id}
                        >
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className={s.th}
                                    style={{
                                        width: header.getSize(),
                                    }}
                                >
                                    <div
                                        {...{
                                            className: header.column.getCanSort()
                                                ? 'cursor-pointer select-none'
                                                : '',
                                            onClick: header.column.getToggleSortingHandler(),
                                        }}
                                    >
                                        {{
                                            asc: ' 🔼',
                                            desc: ' 🔽',
                                        }[header.column.getIsSorted() as string] ?? null}
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        {header.column.getCanFilter() ? (
                                            <div>
                                                <Filter column={header.column} table={table} />
                                            </div>
                                        ) : null}
                                    </div>
                                    <div
                                        {...{
                                            onMouseDown: header.getResizeHandler(),
                                            onTouchStart: header.getResizeHandler(),
                                            // className: `resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`,
                                            className: cx(s.resizer, { [s.isResizing]: header.column.getIsResizing() }),
                                            style: {
                                                // transform:
                                                //     columnResizeMode === 'onEnd' &&
                                                //         header.column.getIsResizing()
                                                //         ? `translateX(${table.getState().columnSizingInfo.deltaOffset
                                                //         }px)`
                                                //         : '',
                                            },
                                        }}
                                    />
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>

                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} style={{
                                    width: cell.column.getSize(),
                                }}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    {table.getFooterGroups().map(footerGroup => (
                        <tr key={footerGroup.id}>
                            {footerGroup.headers.map(header => (
                                <th key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.footer,
                                            header.getContext()
                                        )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </tfoot>
            </table>
            <Pagination
                page={table.getState().pagination.pageIndex + 1}
                // onChange={setPage}
                // onClick={page => table.setPageIndex(table.getPageCount() - 1)}
                onChange={page => table.setPageIndex(page - 1)}
                total={table.getPageCount()}
            />

            <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                    table.setPageSize(Number(e.target.value))
                }}
            >
                {[10, 20, 30, 40, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                        Show {pageSize}
                    </option>
                ))}
            </select>
        </>
    )
}

const View: React.FC = () => {
    const def = useData()
    if (!def) {
        return null
    }

    return (
        <PropertyTable
            columns={def[0]}
            data={def[1]}
        />
    )

    // return (
    //     <Table>
    //         <thead>
    //             <tr>
    //                 {head.map((key, i) => (
    //                     <th key={i}>{key}</th>
    //                 ))}
    //             </tr>
    //         </thead>
    //         <tbody>
    //             {rows.map((row, i) => (
    //                 <tr key={i}>
    //                     {head.map((key, i) => (
    //                         <td key={i}>{row[key]}</td>
    //                     ))}
    //                 </tr>
    //             ))}
    //         </tbody>
    //     </Table>
    // )
}

// async function main() {
//     await emit("properties-init", { kek: 1 })
// }

// main()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        {/* <Provider store={store}> */}
        <ThemeProvider dark={false}>
            <App />
        </ThemeProvider>
        {/* </Provider> */}
    </React.StrictMode>
);
