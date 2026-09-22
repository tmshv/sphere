import { render, screen } from "@/test-utils"
import { makeCaptureStore } from "@/testutils"
import type { FormatDetails } from "@/lib/source-reader"
import userEvent from "@testing-library/user-event"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { CsvGeometryConfig } from "./CsvGeometryConfig"

type CsvDetails = Extract<FormatDetails, { format: "csv" }>

// A CSV that needs a WKT column still arrives with x/y populated, because the
// loader falls back to lng/lat whenever no geometry params were given. That is
// exactly the state in which a mode switch has to produce a clean payload.
const details: CsvDetails = {
    format: "csv",
    mode: "xy",
    wkt_column: null,
    x_column: "lng",
    y_column: "lat",
    header_columns: ["name", "lng", "lat", "geom"],
    parsed_rows: 3,
    skipped_rows: 0,
}

function renderConfig(overrides: Partial<CsvDetails> = {}) {
    const { store, dispatched } = makeCaptureStore()
    render(
        <Provider store={store}>
            <CsvGeometryConfig sourceId={"s1"} details={{ ...details, ...overrides }} />
        </Provider>,
    )
    return { dispatched }
}

// The nearest element holding both pickers — the row if they share one, the
// stack of the whole config if they do not.
function rowContaining(first: Element, second: Element) {
    let node = first.parentElement
    while (node) {
        if (node.contains(second)) {
            return node
        }
        node = node.parentElement
    }
    return null
}

async function chooseOption(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
    await user.click(screen.getByLabelText(label))
    await user.click(await screen.findByText(option))
}

describe("CsvGeometryConfig", () => {
    it("shows the x and y pickers for an xy source", () => {
        renderConfig()

        expect(screen.getByLabelText("X column")).toBeInTheDocument()
        expect(screen.getByLabelText("Y column")).toBeInTheDocument()
        expect(screen.queryByLabelText("WKT column")).not.toBeInTheDocument()
    })

    it("puts the x and y pickers on one row", () => {
        renderConfig()
        const row = rowContaining(screen.getByLabelText("X column"), screen.getByLabelText("Y column"))
        if (!row) {
            throw new Error("no common ancestor for the x and y pickers")
        }
        const style = window.getComputedStyle(row)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("row")
    })

    it("swaps to the wkt picker when the mode is switched", async () => {
        const user = userEvent.setup()
        renderConfig()

        await user.click(screen.getByText("WKT"))

        expect(screen.getByLabelText("WKT column")).toBeInTheDocument()
        expect(screen.queryByLabelText("X column")).not.toBeInTheDocument()
    })

    it("waits for a column before applying a mode the file has no choice for yet", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig()

        await user.click(screen.getByText("WKT"))

        // Half a choice is not something the backend can answer, so nothing is
        // sent until the WKT column names a column.
        expect(dispatched.filter(a => a.type === "sourceInfo/applyCsvGeometry")).toHaveLength(0)
    })

    // The regression guard: before the payload was narrowed, this dispatch also
    // carried the x/y columns left over from the loaded geometry, and the
    // backend rejected the whole request.
    it("applies the moment a wkt column is picked, with only that column", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig()

        await user.click(screen.getByText("WKT"))
        await chooseOption(user, "WKT column", "geom")

        const applied = dispatched.find(a => a.type === "sourceInfo/applyCsvGeometry")
        expect(applied?.payload).toEqual({ id: "s1", mode: "wkt", wktColumn: "geom" })
    })

    it("applies an x/y pair once both halves are picked, and not before", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig({ mode: "wkt", wkt_column: "geom", x_column: null, y_column: null })
        const applications = () => dispatched.filter(a => a.type === "sourceInfo/applyCsvGeometry")

        await user.click(screen.getByText("X / Y"))
        await chooseOption(user, "X column", "lng")
        expect(applications()).toHaveLength(0)

        await chooseOption(user, "Y column", "lat")

        expect(applications().at(0)?.payload).toEqual({ id: "s1", mode: "xy", xColumn: "lng", yColumn: "lat" })
    })

    it("applies a mode switch straight away when the new mode already has its columns", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig({ mode: "wkt", wkt_column: "geom", x_column: "lng", y_column: "lat" })

        await user.click(screen.getByText("X / Y"))

        const applied = dispatched.find(a => a.type === "sourceInfo/applyCsvGeometry")
        expect(applied?.payload).toEqual({ id: "s1", mode: "xy", xColumn: "lng", yColumn: "lat" })
    })

    it("does not reapply a column that is already the applied one", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig()

        await chooseOption(user, "X column", "lng")

        expect(dispatched.filter(a => a.type === "sourceInfo/applyCsvGeometry")).toHaveLength(0)
    })

    it("warns about an applied column the file no longer has", () => {
        renderConfig({ header_columns: ["name", "geom"] })

        expect(screen.getByText("Not in this file: lng, lat")).toBeInTheDocument()
    })
})
