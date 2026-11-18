import type { SortingState } from "@tanstack/react-table"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { PropertesTable } from "../../PropertiesTable"
import {
    PROPERTY_COLUMNS,
    PROPERTY_FILTER_ALL,
    PROPERTY_META,
    PROPERTY_PAGE_SIZE_OPTIONS,
    PROPERTY_ROWS,
    sortPropertyRows,
} from "../fixtures"
import { propertiesWindowStyle } from "../layout"

const WINDOW_PAGE_SIZE = 50

type AttributeFilter = "all" | "selection"

function PropertiesWindow() {
    const [pageSize, setPageSize] = useState(WINDOW_PAGE_SIZE)
    const [pageIndex, setPageIndex] = useState(0)
    const [filter, setFilter] = useState<AttributeFilter>(PROPERTY_FILTER_ALL)
    const [sorting, setSorting] = useState<SortingState>([])

    // Honest empty state: nothing is selected in this window, so the Selection filter shows no rows.
    const rows = filter === PROPERTY_FILTER_ALL ? sortPropertyRows(PROPERTY_ROWS, sorting) : []
    const start = pageIndex * pageSize

    return (
        <div style={propertiesWindowStyle}>
            <PropertesTable
                columns={[...PROPERTY_COLUMNS]}
                meta={PROPERTY_META}
                data={rows.slice(start, start + pageSize)}
                pageIndex={pageIndex}
                pageCount={Math.ceil(rows.length / pageSize)}
                pageSize={pageSize}
                pageSizeOptions={[...PROPERTY_PAGE_SIZE_OPTIONS]}
                attributeFilter={filter}
                sorting={sorting}
                onPageChange={setPageIndex}
                onPageSizeChange={size => {
                    setPageSize(size)
                    setPageIndex(0)
                }}
                onAttributeFilterChange={value => {
                    setFilter(value)
                    setPageIndex(0)
                }}
                onSortingChange={setSorting}
            />
        </div>
    )
}

const meta = {
    title: "Compositions/PropertiesWindow",
    component: PropertiesWindow,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PropertiesWindow>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
