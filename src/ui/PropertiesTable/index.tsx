import { Statusbar } from "@/ui/Statusbar"
import {
    ActionIcon,
    Badge,
    Box,
    Flex,
    Image,
    MantineProvider,
    type MantineTheme,
    Tooltip,
    createStyles,
} from "@mantine/core"
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconPhoto, IconPhotoOff } from "@tabler/icons"
import {
    type CellContext,
    type ColumnDef,
    type OnChangeFn,
    type SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { useState } from "react"
import { BarChart } from "./BarChart"

type StringPropertyMeta = {
    type: "string"
    unique: number
}

type IntPropertyMeta = {
    type: "int"
    min?: number
    max?: number
    mean?: number
    hist?: number[]
}

type FloatPropertyMeta = {
    type: "float"
    min?: number
    max?: number
    mean?: number
    hist?: number[]
}

export type PropertyItemMeta =
    | StringPropertyMeta
    | IntPropertyMeta
    | FloatPropertyMeta
    | {
          type: "url" | "date" | "empty" | "mixed" | "unknown"
      }

export type PropertyItem = Record<string, unknown>

const useStyle = createStyles(theme => ({
    table: {
        borderCollapse: "collapse",
        border: `1px solid ${theme.colors.gray[1]}`,
    },
    thead: {
        position: "sticky",
        top: 0,
    },
    tr: {
        margin: 0,
    },
    th: {
        position: "relative",
        border: `1px solid ${theme.colors.gray[1]}`,

        cursor: "default",
        userSelect: "none",

        // height: 30,
        padding: 0,
    },
    td: {
        border: `1px solid ${theme.colors.gray[1]}`,
        verticalAlign: "top",
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    },
    resizer: {
        position: "absolute",
        right: -3,
        top: theme.spacing.xs,
        height: `calc(100% - ${theme.spacing.xs}px * 2)`,
        width: 6,
        cursor: "col-resize",
        borderRadius: theme.radius.sm,
        zIndex: 1,
        background: theme.primaryColor,
        opacity: 0,
        "&:hover": {
            opacity: 0.5,
        },
    },
    resizing: {
        opacity: 0.5,
    },
    mixedItem: {
        marginRight: theme.spacing.xs,
    },
    icon: {
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        },
    },
    widget: {
        fontFamily: "monospace",
        userSelect: "none",
        cursor: "default",
        backgroundColor: theme.colors.dark,
        color: theme.white,
    },
    widgetSelect: {
        cursor: "pointer",
        "&:hover": {
            backgroundColor: theme.colors.gray[8],
        },
    },
}))

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
    meta: Record<string, PropertyItemMeta>
    pageIndex: number
    pageCount: number
    sorting: SortingState
    onPageChange: (index: number) => void
    onSortingChange: OnChangeFn<SortingState>
}

export const PropertesTable: React.FC<PropertyTableProps> = ({
    data,
    columns,
    meta,
    pageIndex,
    pageCount,
    sorting,
    onPageChange,
    onSortingChange,
}) => {
    const { classes: s, cx } = useStyle()
    const [photos, setPhotos] = useState<Record<string, boolean>>({})
    const table = useReactTable({
        data,
        columns,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        pageCount,
        state: {
            sorting,
            pagination: { pageIndex, pageSize: 50 },
        },
        onSortingChange,
    })

    return (
        <Flex direction={"column"} style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
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
                            <tr key={headerGroup.id} className={s.tr}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className={s.th}
                                        style={{
                                            width: header.getSize(),
                                        }}
                                    >
                                        <Flex
                                            align={"center"}
                                            p={"sm"}
                                            gap={"xs"}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            {{
                                                asc: <IconArrowUp size={16} />,
                                                desc: <IconArrowDown size={16} />,
                                            }[header.column.getIsSorted() as string] ?? null}
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                            <Box style={{ flex: 1 }} />
                                            {meta[header.column.id].type !== "url" ? null : (
                                                <ActionIcon
                                                    size={"xs"}
                                                    onClick={() => {
                                                        setPhotos(photos => ({
                                                            ...photos,
                                                            [header.column.id]: !photos[header.column.id],
                                                        }))
                                                    }}
                                                >
                                                    {photos[header.column.id] ? (
                                                        <IconPhoto size={16} />
                                                    ) : (
                                                        <IconPhotoOff size={16} />
                                                    )}
                                                </ActionIcon>
                                            )}
                                            <Badge size={"xs"} radius={"xs"}>
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
                            <tr key={headerGroup.id} className={s.tr}>
                                {headerGroup.headers.map(header => {
                                    const t = meta[header.column.id]
                                    let content: React.ReactNode = null

                                    switch (t.type) {
                                        case "string": {
                                            content = (
                                                <Flex align={"center"} direction={"row-reverse"} p={"sm"} gap={"xs"}>
                                                    <Badge size={"xs"} radius={"sm"}>
                                                        unique={t.unique}
                                                    </Badge>
                                                </Flex>
                                            )
                                            break
                                        }
                                        case "int": {
                                            content = (
                                                <Flex direction={"row"} p={"sm"} gap={"xs"} justify={"space-between"}>
                                                    {!t.hist ? null : (
                                                        <BarChart
                                                            width={50}
                                                            height={50}
                                                            // min={t.min}
                                                            // max={t.max}
                                                            data={t.hist}
                                                            color={"rgb(34, 139, 230)"}
                                                        />
                                                    )}
                                                    <Flex gap={"xs"} direction={"column"}>
                                                        <Badge size={"xs"} radius={"sm"}>
                                                            min={t.min}
                                                        </Badge>
                                                        <Badge size={"xs"} radius={"sm"}>
                                                            max={t.max}
                                                        </Badge>
                                                    </Flex>
                                                </Flex>
                                            )
                                            break
                                        }
                                        case "float": {
                                            content = (
                                                <Flex direction={"row"} p={"sm"} gap={"xs"} justify={"space-between"}>
                                                    {!t.hist ? null : (
                                                        <BarChart
                                                            width={50}
                                                            height={50}
                                                            // min={t.min}
                                                            // max={t.max}
                                                            data={t.hist}
                                                            color={"rgb(34, 139, 230)"}
                                                        />
                                                    )}
                                                    <Flex gap={"xs"} direction={"column"}>
                                                        <Badge size={"xs"} radius={"sm"}>
                                                            min={t.min}
                                                        </Badge>
                                                        <Badge size={"xs"} radius={"sm"}>
                                                            max={t.max}
                                                        </Badge>
                                                    </Flex>
                                                </Flex>
                                            )
                                            break
                                        }
                                        default: {
                                            break
                                        }
                                    }

                                    return (
                                        <th
                                            key={header.id}
                                            className={s.th}
                                            style={{
                                                width: header.getSize(),
                                            }}
                                        >
                                            {content}
                                            {/* <Flex
                                            align={'center'}
                                            p={'sm'}
                                            gap={'xs'}
                                        >
                                            <Badge>string</Badge>
                                        </Flex> */}
                                        </th>
                                    )
                                })}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={s.tr}>
                                {row.getVisibleCells().map(cell => {
                                    let render = (info: CellContext<PropertyItem, unknown>): React.ReactNode =>
                                        String(info.getValue() ?? "")

                                    const type = meta[cell.column.id].type
                                    switch (type) {
                                        case "url": {
                                            render = info => {
                                                const value = String(info.getValue() ?? "")
                                                if (photos[info.column.id]) {
                                                    return <Image src={value} width={50} height={50} />
                                                }
                                                const url = new URL(value)
                                                return (
                                                    <Tooltip label={value} openDelay={500}>
                                                        <Badge
                                                            size={"sm"}
                                                            radius={"sm"}
                                                            variant={"outline"}
                                                            color={"dark"}
                                                        >
                                                            {url.hostname}
                                                            {url.pathname}
                                                        </Badge>
                                                    </Tooltip>
                                                )
                                            }
                                            break
                                        }
                                        case "mixed": {
                                            render = info => {
                                                const value = info.getValue()
                                                if (Array.isArray(value)) {
                                                    return (
                                                        <>
                                                            {value.map(x => (
                                                                <Badge
                                                                    key={String(x)}
                                                                    className={s.mixedItem}
                                                                    size={"sm"}
                                                                    radius={"sm"}
                                                                    variant="outline"
                                                                    color={"dark"}
                                                                >
                                                                    {String(x)}
                                                                </Badge>
                                                            ))}
                                                        </>
                                                    )
                                                }
                                                return null
                                            }
                                            break
                                        }
                                        case "date": {
                                            render = info => {
                                                const raw = info.getValue()
                                                if (raw == null) return null
                                                const label = String(raw)
                                                const d = new Date(typeof raw === "number" ? raw : label)
                                                if (Number.isNaN(d.getTime())) return <span>{label}</span>
                                                return (
                                                    <Tooltip label={label} openDelay={500}>
                                                        <span>{format(d, "yyyy-MM-dd hh:mm:ss")}</span>
                                                    </Tooltip>
                                                )
                                            }
                                            break
                                        }
                                        case "int": {
                                            render = info => {
                                                const value = String(info.getValue() ?? "")
                                                return (
                                                    <span
                                                        style={{
                                                            textAlign: "right",
                                                            display: "inline-block",
                                                            width: "100%",
                                                        }}
                                                    >
                                                        {value}
                                                    </span>
                                                )
                                            }
                                            break
                                        }
                                        case "float": {
                                            render = info => {
                                                const value = String(info.getValue() ?? "")
                                                return (
                                                    <span
                                                        style={{
                                                            textAlign: "right",
                                                            display: "inline-block",
                                                            width: "100%",
                                                        }}
                                                    >
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
                            <tr key={footerGroup.id} className={s.tr}>
                                {footerGroup.headers.map(header => (
                                    <th key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.footer, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </tfoot>
                </table>
            </div>

            <Statusbar>
                <MantineProvider
                    theme={{
                        components: {
                            ActionIcon: {
                                defaultProps: (theme: MantineTheme) => ({
                                    size: "xs",
                                    radius: "sm",
                                    className: s.icon,
                                    sx: {
                                        "&[data-disabled]": {
                                            backgroundColor: "#00000000",
                                            color: theme.colors.gray[8],
                                            border: "none",
                                        },
                                    },
                                }),
                            },
                        },
                    }}
                >
                    <ActionIcon disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}>
                        <IconChevronLeft size={14} />
                    </ActionIcon>
                    <Badge className={s.widget} radius="sm" size="sm" variant="light">
                        {pageIndex + 1} / {pageCount}
                    </Badge>
                    <ActionIcon disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)}>
                        <IconChevronRight size={14} />
                    </ActionIcon>
                </MantineProvider>

                <Box style={{ flex: 1 }} />
            </Statusbar>
        </Flex>
    )
}
