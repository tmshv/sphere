import type { SortingState } from "@tanstack/react-table"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import {
    PROPERTY_COLUMNS,
    PROPERTY_FILTER_ALL,
    PROPERTY_FILTER_SELECTION,
    PROPERTY_META,
    PROPERTY_PAGE_COUNT,
    PROPERTY_PAGE_SIZE,
    PROPERTY_PAGE_SIZE_OPTIONS,
    PROPERTY_ROWS,
    PROPERTY_SORT,
} from "../stories/fixtures"
import { tableStyle } from "../stories/layout"
import { PropertesTable, type PropertyItem } from "."

const ASCENDING = 1
const DESCENDING = -1

type TableProps = React.ComponentProps<typeof PropertesTable>

function sortRows(rows: ReadonlyArray<PropertyItem>, sorting: SortingState): PropertyItem[] {
    const sort = sorting.at(0)
    if (sort === undefined) {
        return [...rows]
    }

    const direction = sort.desc ? DESCENDING : ASCENDING
    return [...rows].sort((a, b) => {
        const left = a[sort.id]
        const right = b[sort.id]
        if (typeof left === "number" && typeof right === "number") {
            return (left - right) * direction
        }
        return String(left).localeCompare(String(right)) * direction
    })
}

function PropertiesTableDemo({
    pageIndex: initialPage,
    pageSize: initialPageSize,
    sorting: initialSorting,
    attributeFilter: initialFilter,
    onPageChange,
    onPageSizeChange,
    onSortingChange,
    onAttributeFilterChange,
    ...rest
}: TableProps) {
    const [pageIndex, setPageIndex] = useState(initialPage)
    const [pageSize, setPageSize] = useState(initialPageSize)
    const [sorting, setSorting] = useState(initialSorting)
    const [attributeFilter, setAttributeFilter] = useState(initialFilter)

    const start = pageIndex * pageSize
    const data = sortRows(PROPERTY_ROWS, sorting).slice(start, start + pageSize)
    const pageCount = Math.ceil(PROPERTY_ROWS.length / pageSize)

    return (
        <div style={tableStyle}>
            <PropertesTable
                {...rest}
                data={data}
                pageIndex={pageIndex}
                pageCount={pageCount}
                pageSize={pageSize}
                attributeFilter={attributeFilter}
                sorting={sorting}
                onPageChange={index => {
                    setPageIndex(index)
                    onPageChange(index)
                }}
                onPageSizeChange={size => {
                    setPageSize(size)
                    setPageIndex(0)
                    onPageSizeChange(size)
                }}
                onAttributeFilterChange={value => {
                    setAttributeFilter(value)
                    onAttributeFilterChange(value)
                }}
                onSortingChange={updater => {
                    setSorting(updater)
                    onSortingChange(updater)
                }}
            />
        </div>
    )
}

const meta = {
    title: "Data/PropertiesTable",
    component: PropertesTable,
    tags: ["autodocs"],
    args: {
        data: [...PROPERTY_ROWS],
        columns: [...PROPERTY_COLUMNS],
        meta: PROPERTY_META,
        pageIndex: 0,
        pageCount: PROPERTY_PAGE_COUNT,
        pageSize: PROPERTY_PAGE_SIZE,
        pageSizeOptions: [...PROPERTY_PAGE_SIZE_OPTIONS],
        attributeFilter: PROPERTY_FILTER_ALL,
        sorting: [],
        onPageChange: fn(),
        onPageSizeChange: fn(),
        onAttributeFilterChange: fn(),
        onSortingChange: fn(),
    },
    argTypes: { attributeFilter: { control: "radio", options: [PROPERTY_FILTER_ALL, PROPERTY_FILTER_SELECTION] } },
    render: args => <PropertiesTableDemo {...args} />,
} satisfies Meta<typeof PropertesTable>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sorted: Story = { args: { sorting: PROPERTY_SORT } }

export const LastPage: Story = { args: { pageIndex: PROPERTY_PAGE_COUNT - 1 } }
