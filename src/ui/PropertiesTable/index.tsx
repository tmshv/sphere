import { useState } from 'react';
import { Table, Column, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table'
import { createStyles, Pagination } from "@mantine/core";

export type PropertyItem = Record<string, any>

export type FilterProps = {
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

const useStyle = createStyles(theme => ({
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

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
}

export const PropertesTable: React.FC<PropertyTableProps> = ({ data, columns }) => {
    const { classes: s, cx } = useStyle()
    const [sorting, setSorting] = useState<SortingState>([])
    const table = useReactTable({
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
