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

    it("swaps to the wkt picker when the mode is switched", async () => {
        const user = userEvent.setup()
        renderConfig()

        await user.click(screen.getByText("WKT"))

        expect(screen.getByLabelText("WKT column")).toBeInTheDocument()
        expect(screen.queryByLabelText("X column")).not.toBeInTheDocument()
    })

    it("keeps Apply disabled until the new mode has a column", async () => {
        const user = userEvent.setup()
        renderConfig()

        await user.click(screen.getByText("WKT"))

        expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled()
    })

    // The regression guard: before the payload was narrowed, this dispatch also
    // carried the x/y columns left over from the loaded geometry, and the
    // backend rejected the whole request.
    it("dispatches only the wkt column after switching mode and applying", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig()

        await user.click(screen.getByText("WKT"))
        await chooseOption(user, "WKT column", "geom")
        await user.click(screen.getByRole("button", { name: "Apply" }))

        const applied = dispatched.find(a => a.type === "sourceInfo/applyCsvGeometry")
        expect(applied?.payload).toEqual({ id: "s1", mode: "wkt", wktColumn: "geom" })
    })

    it("dispatches only the x/y pair when applying an xy change", async () => {
        const user = userEvent.setup()
        const { dispatched } = renderConfig({ mode: "wkt", wkt_column: "geom", x_column: null, y_column: null })

        await user.click(screen.getByText("X / Y"))
        await chooseOption(user, "X column", "lng")
        await chooseOption(user, "Y column", "lat")
        await user.click(screen.getByRole("button", { name: "Apply" }))

        const applied = dispatched.find(a => a.type === "sourceInfo/applyCsvGeometry")
        expect(applied?.payload).toEqual({ id: "s1", mode: "xy", xColumn: "lng", yColumn: "lat" })
    })

    it("warns about an applied column the file no longer has", () => {
        renderConfig({ header_columns: ["name", "geom"] })

        expect(screen.getByText("Not in this file: lng, lat")).toBeInTheDocument()
    })
})
