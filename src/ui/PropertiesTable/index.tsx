import { useState } from 'react';
import { Table, Column, CellContext, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, ColumnDef, SortingState } from '@tanstack/react-table'
import { Badge, Box, createStyles, Flex, Pagination, Select, Tooltip } from "@mantine/core";
import { format } from 'date-fns'
import { IconArrowDown, IconArrowUp } from '@tabler/icons';

export type PropertyItemMeta = {
    type: 'string' | 'url' | 'int' | 'float' | 'date' | "empty" | "mixed" | "unknown"
}
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
    table: {
        borderCollapse: 'collapse',
        border: `1px solid ${theme.colors.gray[1]}`,
    },
    thead: {
        position: 'sticky',
        top: 0,
    },
    tr: {
        margin: 0,
    },
    th: {
        position: 'relative',
        border: `1px solid ${theme.colors.gray[1]}`,

        cursor: 'default',
        userSelect: 'none',

        // height: 30,
        padding: 0,
    },
    td: {
        border: `1px solid ${theme.colors.gray[1]}`,
        verticalAlign: "top",
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    },
    resizer: {
        position: 'absolute',
        right: -3,
        top: theme.spacing.xs,
        height: `calc(100% - ${theme.spacing.xs}px * 2)`,
        width: 6,
        cursor: "col-resize",
        borderRadius: theme.radius.sm,
        zIndex: 1,
        background: theme.primaryColor,
        opacity: 0,
        '&:hover': {
            opacity: 0.5,
        }
    },
    resizing: {
        opacity: 0.5,
    },
    mixedItem: {
        marginRight: theme.spacing.xs,
    }
}))

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
    meta: Record<string, PropertyItemMeta>
}

export const PropertesTable: React.FC<PropertyTableProps> = ({ data, columns, meta }) => {
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
        <Flex direction={'column'} gap={'sm'}>
            <table
                className={s.table}
                style={{
                    width: table.getCenterTotalSize(),
                }}
                cellPadding={0}
                cellSpacing={0}
            >
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr
                            key={headerGroup.id}
                            className={s.tr}
                        >
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className={s.th}
                                    style={{
                                        width: header.getSize(),
                                    }}
                                >
                                    <Flex
                                        align={'center'}
                                        p={'sm'}
                                        gap={'xs'}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {{
                                            asc: (
                                                <IconArrowUp size={16} />
                                            ),
                                            desc: (
                                                <IconArrowDown size={16} />
                                            ),
                                        }[header.column.getIsSorted() as string] ?? null}
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        <Box style={{ flex: 1 }} />
                                        <Badge size={'xs'} radius={'xs'}>
                                            {meta[header.column.id].type}
                                        </Badge>
                                        {/* {header.column.getCanFilter() ? (
                                            <div>
                                                <Filter column={header.column} table={table} />
                                            </div>
                                        ) : null} */}
                                    </Flex>
                                    <div
                                        className={cx(s.resizer, {
                                            [s.resizing]: header.column.getIsResizing(),
                                        })}
                                        // style={{
                                        //     transform:
                                        //         columnResizeMode === 'onEnd' &&
                                        //             header.column.getIsResizing()
                                        //             ? `translateX(${table.getState().columnSizingInfo.deltaOffset
                                        //             }px)`
                                        //             : '',
                                        // }}
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                    />
                                </th>
                            ))}
                        </tr>
                    ))}
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr
                            key={headerGroup.id}
                            className={s.tr}
                        >
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className={s.th}
                                    style={{
                                        width: header.getSize(),
                                    }}
                                >
                                    <Flex
                                        align={'center'}
                                        p={'sm'}
                                        gap={'xs'}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <Badge>string</Badge>
                                    </Flex>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>

                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr
                            key={row.id}
                            className={s.tr}
                        >
                            {row.getVisibleCells().map(cell => {
                                let render = (info: CellContext<PropertyItem, any>) => info.getValue()

                                const type = meta[cell.column.id].type
                                switch (type) {
                                    case 'url': {
                                        render = info => {
                                            const value = info.getValue()
                                            const url = new URL(value)
                                            return (
                                                <Tooltip label={value} openDelay={500}>
                                                    <Badge size={'sm'} radius={'sm'} variant={'outline'} color={'dark'}>{url.hostname}{url.pathname}</Badge>
                                                </Tooltip>
                                            )
                                        }
                                        break
                                    }
                                    case 'mixed': {
                                        render = info => {
                                            const value = cell.getValue()
                                            if (Array.isArray(value)) {
                                                return (
                                                    <>
                                                        {value.map(x => (
                                                            <Badge key={x} className={s.mixedItem} size={'sm'} radius={"sm"} variant="outline" color={"dark"}>{x}</Badge>
                                                        ))}
                                                    </>
                                                )
                                            }
                                        }
                                        break
                                    }
                                    case 'date': {
                                        render = info => {
                                            const value = info.getValue()
                                            return (
                                                <Tooltip label={value} openDelay={500}>
                                                    <span>
                                                        {format(new Date(value), "yyyy-MM-dd hh:mm:ss")}
                                                    </span>
                                                </Tooltip>
                                            )
                                        }
                                        break
                                    }
                                    case 'int': {
                                        render = info => {
                                            const value = info.getValue()
                                            return (
                                                <span style={{ textAlign: 'right', display: 'inline-block', width: '100%' }}>
                                                    {value}
                                                </span>
                                            )
                                        }
                                        break
                                    }
                                    case 'float': {
                                        render = info => {
                                            const value = info.getValue()
                                            return (
                                                <span style={{ textAlign: 'right', display: 'inline-block', width: '100%' }}>
                                                    {value}
                                                </span>
                                            )
                                        }
                                        break
                                    }
                                    default: {
                                        break
                                    }
                                }

                                return (
                                    <td
                                        key={cell.id}
                                        className={s.td}
                                        style={{
                                            width: cell.column.getSize(),
                                        }}
                                    >
                                        {flexRender(render, cell.getContext())}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    {table.getFooterGroups().map(footerGroup => (
                        <tr
                            key={footerGroup.id}
                            className={s.tr}
                        >
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

            <Flex justify={"space-between"}>
                <Pagination
                    page={table.getState().pagination.pageIndex + 1}
                    // onChange={setPage}
                    // onClick={page => table.setPageIndex(table.getPageCount() - 1)}
                    onChange={page => table.setPageIndex(page - 1)}
                    total={table.getPageCount()}
                />

                <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onChange={value => {
                        if (!value) {
                            return
                        }
                        table.setPageSize(Number(value))
                    }}
                    data={[10, 25, 50, 100].map(x => ({
                        label: `${x}`,
                        value: `${x}`,
                    }))}
                />
            </Flex>
        </Flex >
    )
}
