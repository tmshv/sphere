import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { PropertesTable, type PropertyItem, type PropertyItemMeta } from "."

const COLUMNS: ColumnDef<PropertyItem>[] = [
    { id: "name", accessorKey: "name", header: "name" },
    { id: "count", accessorKey: "count", header: "count" },
    { id: "photo", accessorKey: "photo", header: "photo" },
]

const META: Record<string, PropertyItemMeta> = {
    name: { type: "string", unique: 2 },
    count: { type: "int", min: 1, max: 9 },
    photo: { type: "url" },
}

const PHOTO_URL = "https://example.com/a.png"

const DATA: PropertyItem[] = [
    { name: "Berlin", count: 1, photo: PHOTO_URL },
    { name: "Paris", count: 9, photo: PHOTO_URL },
]

const PAGE_SIZE_OPTIONS = [
    { value: "50", label: "50 per page" },
    { value: "100", label: "100 per page" },
]

type Overrides = {
    pageIndex?: number
    pageCount?: number
    sorting?: SortingState
}

function renderTable({ pageIndex = 0, pageCount = 3, sorting = [] }: Overrides = {}) {
    const handlers = {
        onPageChange: vi.fn(),
        onPageSizeChange: vi.fn(),
        onAttributeFilterChange: vi.fn(),
        onSortingChange: vi.fn(),
    }
    render(
        <PropertesTable
            data={DATA}
            columns={COLUMNS}
            meta={META}
            pageIndex={pageIndex}
            pageCount={pageCount}
            pageSize={50}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            attributeFilter="all"
            sorting={sorting}
            {...handlers}
        />,
    )
    return handlers
}

describe("PropertesTable", () => {
    it("renders column headers, type badges and summaries", () => {
        renderTable()
        expect(screen.getByRole("columnheader", { name: /name/ })).toBeInTheDocument()
        expect(screen.getByText("string")).toBeInTheDocument()
        expect(screen.getByText("int")).toBeInTheDocument()
        expect(screen.getByText("unique=2")).toBeInTheDocument()
        expect(screen.getByText("min=1")).toBeInTheDocument()
        expect(screen.getByText("max=9")).toBeInTheDocument()
    })

    it("renders a cell per value", () => {
        renderTable()
        expect(screen.getByRole("cell", { name: "Berlin" })).toBeInTheDocument()
        expect(screen.getByRole("cell", { name: "Paris" })).toBeInTheDocument()
        expect(screen.getByRole("cell", { name: "9" })).toBeInTheDocument()
    })

    it("shows the current page out of the page count", () => {
        renderTable({ pageIndex: 1, pageCount: 3 })
        expect(screen.getByText("2 / 3")).toBeInTheDocument()
    })

    it("shows 0 / 0 when there are no pages", () => {
        renderTable({ pageIndex: 0, pageCount: 0 })
        expect(screen.getByText("0 / 0")).toBeInTheDocument()
    })

    it("pages forward and backward", () => {
        const { onPageChange } = renderTable({ pageIndex: 1, pageCount: 3 })
        const [prev, next] = screen.getAllByRole("button").slice(-2)
        fireEvent.click(prev)
        expect(onPageChange).toHaveBeenCalledWith(0)
        fireEvent.click(next)
        expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it("disables previous on the first page and next on the last", () => {
        renderTable({ pageIndex: 0, pageCount: 1 })
        const [prev, next] = screen.getAllByRole("button").slice(-2)
        expect(prev).toBeDisabled()
        expect(next).toBeDisabled()
    })

    it("reports attribute filter and page size changes", () => {
        const { onAttributeFilterChange, onPageSizeChange } = renderTable()
        const [filter, pageSize] = screen.getAllByRole("combobox")
        fireEvent.change(filter, { target: { value: "selection" } })
        expect(onAttributeFilterChange).toHaveBeenCalledWith("selection")
        fireEvent.change(pageSize, { target: { value: "100" } })
        expect(onPageSizeChange).toHaveBeenCalledWith(100)
    })

    it("reports the new sort when a header is clicked", () => {
        const { onSortingChange } = renderTable()
        fireEvent.click(screen.getByText("name"))
        expect(onSortingChange).toHaveBeenCalledTimes(1)
        const update = onSortingChange.mock.calls[0][0]
        expect(typeof update === "function" ? update([]) : update).toEqual([{ id: "name", desc: false }])
    })

    it("shows a link as a host and path badge, and as an image once toggled", () => {
        renderTable()
        expect(screen.getAllByText("example.com/a.png")).toHaveLength(2)
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
        const [toggle] = screen.getAllByRole("button")
        fireEvent.click(toggle)
        const images = screen.getAllByRole("img")
        expect(images).toHaveLength(2)
        expect(images[0]).toHaveAttribute("src", PHOTO_URL)
    })
})
