import { Button as BaseButton } from "@base-ui/react/button"
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconPhoto, IconPhotoOff } from "@sphere/icons"
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
import { type ReactNode, useState } from "react"
import iconButton from "../Button/icon-button.module.css"
import { Badge, Tooltip, unstyledButton, ValueImage } from "../internal"
import type { SelectOption } from "../Select"
import { Statusbar, StatusbarSelect } from "../Statusbar"
import { BarChart } from "./BarChart"
import s from "./properties-table.module.css"

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

const ICON_SIZE = 16
const PAGER_ICON_SIZE = 14
const CHART_SIZE = 50
const URL_TOOLTIP_DELAY_MS = 500
const DATE_FORMAT = "yyyy-MM-dd hh:mm:ss"
const CHART_COLOR = "currentColor"

const ATTRIBUTE_FILTER_OPTIONS: SelectOption[] = [
    { value: "all", label: "All" },
    { value: "selection", label: "Selection" },
]

type PropertyTableProps = {
    data: PropertyItem[]
    columns: ColumnDef<PropertyItem>[]
    meta: Record<string, PropertyItemMeta>
    pageIndex: number
    pageCount: number
    pageSize: number
    pageSizeOptions: SelectOption[]
    attributeFilter: "all" | "selection"
    sorting: SortingState
    onPageChange: (index: number) => void
    onPageSizeChange: (size: number) => void
    onAttributeFilterChange: (value: "all" | "selection") => void
    onSortingChange: OnChangeFn<SortingState>
}

function classNames(...names: (string | false | undefined)[]): string {
    return names.filter(Boolean).join(" ")
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
    if (sorted === "asc") return <IconArrowUp size={ICON_SIZE} />
    if (sorted === "desc") return <IconArrowDown size={ICON_SIZE} />
    return null
}

type PhotoToggleProps = {
    shown: boolean
    onToggle: () => void
}

function PhotoToggle({ shown, onToggle }: PhotoToggleProps) {
    const classes = classNames(unstyledButton, iconButton.iconButton, iconButton.sizeSm, iconButton.subtle)
    return (
        <BaseButton className={classes} aria-label={shown ? "Show links" : "Show images"} onClick={() => onToggle()}>
            {shown ? <IconPhoto size={ICON_SIZE} /> : <IconPhotoOff size={ICON_SIZE} />}
        </BaseButton>
    )
}

type PagerButtonProps = {
    label: string
    disabled: boolean
    onClick: () => void
    children: ReactNode
}

// Mantine ActionIcon, gray subtle, size xs, with the footer's nested-provider defaults.
function PagerButton({ label, disabled, onClick, children }: PagerButtonProps) {
    const classes = classNames(unstyledButton, iconButton.iconButton, iconButton.sizeSm, iconButton.subtle, s.pager)
    return (
        <BaseButton className={classes} aria-label={label} disabled={disabled} onClick={() => onClick()}>
            {children}
        </BaseButton>
    )
}

function Histogram({ hist }: { hist?: number[] }) {
    if (!hist) return null
    return <BarChart width={CHART_SIZE} height={CHART_SIZE} data={hist} color={CHART_COLOR} className={s.chart} />
}

function Summary({ type }: { type: PropertyItemMeta }) {
    switch (type.type) {
        case "string": {
            return (
                <div className={s.stringSummary}>
                    <Badge size="xs" radius="sm" variant="light">
                        unique={type.unique}
                    </Badge>
                </div>
            )
        }
        case "int":
        case "float": {
            return (
                <div className={s.numberSummary}>
                    <Histogram hist={type.hist} />
                    <div className={s.minMax}>
                        <Badge size="xs" radius="sm" variant="light">
                            min={type.min}
                        </Badge>
                        <Badge size="xs" radius="sm" variant="light">
                            max={type.max}
                        </Badge>
                    </div>
                </div>
            )
        }
        default: {
            return null
        }
    }
}

type LinkProps = {
    value: string
}

function UrlBadge({ value }: LinkProps) {
    const url = new URL(value)
    return (
        <Tooltip label={value} delay={URL_TOOLTIP_DELAY_MS}>
            <Badge size="sm" radius="sm" variant="outline">
                {url.hostname}
                {url.pathname}
            </Badge>
        </Tooltip>
    )
}

function DateValue({ raw }: { raw: unknown }) {
    if (raw == null) return null
    const label = String(raw)
    const d = new Date(typeof raw === "number" ? raw : label)
    if (Number.isNaN(d.getTime())) return <span>{label}</span>
    return (
        <Tooltip label={label} delay={URL_TOOLTIP_DELAY_MS}>
            <span>{format(d, DATE_FORMAT)}</span>
        </Tooltip>
    )
}

function MixedValue({ value }: { value: unknown }) {
    if (!Array.isArray(value)) return null
    return (
        <>
            {value.map(x => (
                <Badge key={String(x)} className={s.mixedItem} size="sm" radius="sm" variant="outline">
                    {String(x)}
                </Badge>
            ))}
        </>
    )
}

type CellProps = {
    type: PropertyItemMeta["type"]
    info: CellContext<PropertyItem, unknown>
    showPhoto: boolean
}

function CellValue({ type, info, showPhoto }: CellProps) {
    const value = info.getValue()
    switch (type) {
        case "url": {
            const text = String(value ?? "")
            return showPhoto ? <ValueImage src={text} alt={info.column.id} size="small" /> : <UrlBadge value={text} />
        }
        case "mixed": {
            return <MixedValue value={value} />
        }
        case "date": {
            return <DateValue raw={value} />
        }
        case "int":
        case "float": {
            return <span className={s.number}>{String(value ?? "")}</span>
        }
        default: {
            return String(value ?? "")
        }
    }
}

export function PropertesTable({
    data,
    columns,
    meta,
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    attributeFilter,
    sorting,
    onPageChange,
    onPageSizeChange,
    onAttributeFilterChange,
    onSortingChange,
}: PropertyTableProps) {
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
            pagination: { pageIndex, pageSize },
        },
        onSortingChange,
    })

    return (
        <div className={s.root}>
            <div className={s.scroll}>
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
                                        <div
                                            className={s.headerCell}
                                            role="presentation"
                                            onClick={event => {
                                                // The photo toggle sits inside the header: it must not sort.
                                                if (event.target instanceof Element && event.target.closest("button"))
                                                    return
                                                header.column.getToggleSortingHandler()?.(event)
                                            }}
                                        >
                                            <SortIcon sorted={header.column.getIsSorted()} />
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                            <div className={s.spacer} />
                                            {meta[header.column.id].type !== "url" ? null : (
                                                <PhotoToggle
                                                    shown={photos[header.column.id] === true}
                                                    onToggle={() => {
                                                        setPhotos(current => ({
                                                            ...current,
                                                            [header.column.id]: !current[header.column.id],
                                                        }))
                                                    }}
                                                />
                                            )}
                                            <Badge size="xs" radius="xs" variant="light">
                                                {meta[header.column.id].type}
                                            </Badge>
                                        </div>
                                        <div
                                            className={classNames(
                                                s.resizer,
                                                header.column.getIsResizing() && s.resizing,
                                            )}
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                        />
                                    </th>
                                ))}
                            </tr>
                        ))}
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
                                        <Summary type={meta[header.column.id]} />
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={s.tr}>
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        className={s.td}
                                        style={{
                                            width: cell.column.getSize(),
                                        }}
                                    >
                                        <CellValue
                                            type={meta[cell.column.id].type}
                                            info={cell.getContext()}
                                            showPhoto={photos[cell.column.id] === true}
                                        />
                                    </td>
                                ))}
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
                <StatusbarSelect
                    className={s.select}
                    value={attributeFilter}
                    options={ATTRIBUTE_FILTER_OPTIONS}
                    onChange={v => {
                        if (v === "all" || v === "selection") {
                            onAttributeFilterChange(v)
                        }
                    }}
                />

                <div className={s.spacer} />

                <StatusbarSelect
                    className={s.select}
                    value={String(pageSize)}
                    options={pageSizeOptions}
                    onChange={v => onPageSizeChange(Number(v))}
                />

                <PagerButton
                    label="Previous page"
                    disabled={pageIndex === 0}
                    onClick={() => onPageChange(pageIndex - 1)}
                >
                    <IconChevronLeft size={PAGER_ICON_SIZE} />
                </PagerButton>
                <Badge className={s.widget} radius="sm" size="sm" variant="light">
                    {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
                </Badge>
                <PagerButton
                    label="Next page"
                    disabled={pageIndex >= pageCount - 1}
                    onClick={() => onPageChange(pageIndex + 1)}
                >
                    <IconChevronRight size={PAGER_ICON_SIZE} />
                </PagerButton>
            </Statusbar>
        </div>
    )
}
