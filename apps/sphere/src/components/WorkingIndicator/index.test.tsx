import { render, screen } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { WorkingIndicator } from "."

function renderIndicator(pending: boolean) {
    const store = configureStore({
        reducer: {
            source: () => ({ selectedId: null, items: { s1: { id: "s1", pending } }, allIds: ["s1"] }),
        },
    })
    return render(
        <Provider store={store}>
            <WorkingIndicator />
        </Provider>,
    )
}

describe("WorkingIndicator", () => {
    it("renders nothing when no source is pending", () => {
        const { container } = renderIndicator(false)
        expect(container).toBeEmptyDOMElement()
        expect(screen.queryByRole("status")).toBeNull()
    })

    it("renders a busy indicator while a source is pending", () => {
        renderIndicator(true)
        expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    })
})
