import { TEMPLATE_ERRORS } from "@/lib/raster-template"
import { actions } from "@/store"
import appReducer from "@/store/app"
import projectionReducer from "@/store/projection"
import { act, fireEvent, render, screen } from "@/test-utils"
import { type Middleware, type UnknownAction, configureStore, isAction } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { RasterUrlDialog } from "."

const XYZ = "https://tile.example.org/{z}/{x}/{y}.png"
const TITLE = "Add Raster from URL"

function renderDialog({ open = true } = {}) {
    const dispatched: UnknownAction[] = []
    const captureMiddleware: Middleware = () => next => action => {
        if (isAction(action)) dispatched.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer, projection: projectionReducer },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })
    if (open) store.dispatch(actions.app.openRasterUrlDialog())
    dispatched.length = 0
    render(
        <Provider store={store}>
            <RasterUrlDialog />
        </Provider>,
    )
    return { store, dispatched }
}

function templateField() {
    return screen.getByRole("textbox", { name: /^URL template/ })
}

function nameField() {
    return screen.getByRole("textbox", { name: /^Name/ })
}

function addButton() {
    return screen.getByRole("button", { name: "Add" })
}

function addedRasters(dispatched: UnknownAction[]) {
    return dispatched.filter(action => actions.source.addRasterFromUrl.match(action))
}

describe("RasterUrlDialog", () => {
    it("is hidden until opened", () => {
        renderDialog({ open: false })
        expect(screen.queryByText(TITLE)).toBeNull()
    })

    it("shows no error and disables Add while the template is empty", () => {
        renderDialog()
        expect(screen.getByText(TITLE)).toBeInTheDocument()
        expect(screen.queryByText(TEMPLATE_ERRORS.empty)).toBeNull()
        expect(addButton()).toBeDisabled()
    })

    it("shows why a typed template is invalid and keeps Add disabled", () => {
        renderDialog()
        fireEvent.change(templateField(), { target: { value: "https://tile.example.org/tile.png" } })
        expect(screen.getByText(TEMPLATE_ERRORS.noToken)).toBeInTheDocument()
        expect(addButton()).toBeDisabled()
    })

    it("offers the derived name as the Name placeholder", () => {
        renderDialog()
        fireEvent.change(templateField(), { target: { value: XYZ } })
        expect(nameField()).toHaveAttribute("placeholder", "tile.example.org")
    })

    it("adds the raster with the typed template and closes", () => {
        const { store, dispatched } = renderDialog()
        fireEvent.change(templateField(), { target: { value: XYZ } })
        fireEvent.change(nameField(), { target: { value: "Tiles" } })
        expect(addButton()).toBeEnabled()
        fireEvent.click(addButton())

        expect(addedRasters(dispatched).map(action => action.payload)).toEqual([{ template: XYZ, name: "Tiles" }])
        expect(store.getState().app.rasterUrlDialogOpen).toBe(false)
    })

    it("submits on Enter", () => {
        const { dispatched } = renderDialog()
        fireEvent.change(templateField(), { target: { value: XYZ } })
        fireEvent.submit(templateField())
        expect(addedRasters(dispatched)).toHaveLength(1)
    })

    it("does not submit an invalid template on Enter", () => {
        const { store, dispatched } = renderDialog()
        fireEvent.change(templateField(), { target: { value: "https://tile.example.org/tile.png" } })
        fireEvent.submit(templateField())
        expect(addedRasters(dispatched)).toHaveLength(0)
        expect(store.getState().app.rasterUrlDialogOpen).toBe(true)
    })

    it("clears the fields when closed", async () => {
        const { store } = renderDialog()
        fireEvent.change(templateField(), { target: { value: XYZ } })
        fireEvent.click(screen.getByRole("button", { name: /close/i }))
        expect(store.getState().app.rasterUrlDialogOpen).toBe(false)

        act(() => {
            store.dispatch(actions.app.openRasterUrlDialog())
        })
        expect(await screen.findByRole("textbox", { name: /^URL template/ })).toHaveValue("")
    })
})
