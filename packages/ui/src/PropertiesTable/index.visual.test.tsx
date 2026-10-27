import { createColumnHelper } from "@tanstack/react-table"
import { page, userEvent } from "vitest/browser"
import { IMAGE_DATA_URI } from "../visual/fixtures"
import { visualCases } from "../visual/visualCases"
import { PropertesTable, type PropertyItem, type PropertyItemMeta } from "."

// The tooltip sits over a table cell at a fractional position. Mantine kept the fraction; Base UI rounds
// it to a whole pixel, so the label's glyphs anti-alias differently (452 of 480000 pixels, in the tooltip
// text and its edge only). Geometry, colours and text are unchanged.
const TOOLTIP_SUBPIXEL_RATIO = 0.001

const noop = () => {}
const HISTOGRAM = [2, 5, 9, 14, 8, 3]

const columnHelper = createColumnHelper<PropertyItem>()
const COLUMN_SIZES: Record<string, number> = { name: 80, population: 130, photo: 110 }
const COLUMNS = Object.entries(COLUMN_SIZES).map(([id, size]) => columnHelper.accessor(id, { header: id, size }))

const META: Record<string, PropertyItemMeta> = {
    name: { type: "string", unique: 3 },
    population: { type: "int", min: 10, max: 4200, mean: 1350, hist: HISTOGRAM },
    photo: { type: "url" },
}

const LINK_ROWS: PropertyItem[] = [
    { name: "Berlin", population: 3600000, photo: "https://example.com/a.png" },
    { name: "Paris", population: 2100000, photo: "https://example.com/b.png" },
]
const IMAGE_ROWS: PropertyItem[] = [
    { name: "Berlin", population: 3600000, photo: IMAGE_DATA_URI },
    { name: "Paris", population: 2100000, photo: IMAGE_DATA_URI },
]

const PAGE_SIZE_OPTIONS = [
    { value: "25", label: "25" },
    { value: "50", label: "50" },
]

type TableOptions = {
    rows?: PropertyItem[]
    sorting?: { id: string; desc: boolean }[]
    pageIndex?: number
}

function Table({ rows = LINK_ROWS, sorting = [], pageIndex = 0 }: TableOptions) {
    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <PropertesTable
                data={rows}
                columns={COLUMNS}
                meta={META}
                pageIndex={pageIndex}
                pageCount={3}
                pageSize={25}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                attributeFilter="all"
                sorting={sorting}
                onPageChange={noop}
                onPageSizeChange={noop}
                onAttributeFilterChange={noop}
                onSortingChange={noop}
            />
        </div>
    )
}

visualCases("PropertiesTable", {
    default: { render: () => <Table /> },
    "sorted-asc": { render: () => <Table sorting={[{ id: "population", desc: false }]} /> },
    "sorted-desc": { render: () => <Table sorting={[{ id: "population", desc: true }]} /> },
    "last-page": { render: () => <Table pageIndex={2} /> },
    "images-shown": {
        render: () => <Table rows={IMAGE_ROWS} />,
        interact: async () => {
            // The photo column's header button is the only one inside the table head.
            await userEvent.click(page.getByRole("button").first())
            await expect.element(page.getByRole("img").first()).toBeVisible()
        },
    },
    "url-tooltip": {
        render: () => <Table />,
        interact: async () => {
            await userEvent.hover(page.getByText("example.com/a.png").first())
            await expect.element(page.getByRole("tooltip")).toBeVisible()
        },
        target: "page",
        allowedMismatchedPixelRatio: TOOLTIP_SUBPIXEL_RATIO,
    },
})
