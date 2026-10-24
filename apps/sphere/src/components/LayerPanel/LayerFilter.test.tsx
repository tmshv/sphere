import { fireEvent, render, screen } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LayerFilter } from "./LayerFilter"

function renderFilter() {
    const store = configureStore({ reducer: { noop: () => ({}) } })
    render(
        <Provider store={store}>
            <LayerFilter layerId="l1" filterExpression={null} filterError={null} />
        </Provider>,
    )
}

describe("LayerFilter", () => {
    it("shows the typed filter text", () => {
        renderFilter()
        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: '["==", 1, 1]' } })

        expect(screen.getByLabelText("Filter")).toHaveValue('["==", 1, 1]')
    })

    it("offers the clear button only while there is text", () => {
        renderFilter()
        expect(screen.queryByRole("button")).toBeNull()

        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "abc" } })

        expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("empties the field when the clear button is clicked", () => {
        renderFilter()
        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "abc" } })

        fireEvent.click(screen.getByRole("button"))

        expect(screen.getByLabelText("Filter")).toHaveValue("")
        expect(screen.queryByRole("button")).toBeNull()
    })

    it("reports invalid JSON when the field loses focus", () => {
        renderFilter()
        fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "abc" } })

        fireEvent.blur(screen.getByLabelText("Filter"))

        expect(screen.getByText("Invalid JSON expression")).toBeInTheDocument()
    })
})
