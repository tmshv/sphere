import appReducer, { appSlice } from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { LayerType, SourceType } from "@/types"
import type { Source } from "@/types/source"
import { Tabs } from "@mantine/core"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LeftSidebar, StyledTabs } from "."

function renderTabs() {
    return render(
        <StyledTabs value={"sources"}>
            <Tabs.List>
                <Tabs.Tab value={"sources"}>Sources</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value={"sources"}>
                <div>panel body</div>
            </Tabs.Panel>
        </StyledTabs>,
    )
}

const source: Source = {
    id: "s1",
    name: "Roads",
    fractionIndex: 1,
    type: SourceType.Geojson,
    location: "/tmp/roads.geojson",
    editable: false,
    pending: false,
    meta: {
        columns: {},
        pointsCount: 1,
        linesCount: 2,
        polygonsCount: 3,
    },
}

const layer = {
    id: "l1",
    name: "Roads layer",
    type: LayerType.Point,
    visible: true,
    sourceId: null,
    fractionIndex: 1,
    color: "blue",
}

function makeStore() {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }

    const store = configureStore({
        reducer: {
            app: appReducer,
            source: () => ({ selectedId: null, items: { s1: source }, allIds: ["s1"] }),
            draw: () => ({ sourceId: null, selectedIds: [] }),
            layer: () => ({ selectedId: null, items: { l1: layer }, allIds: ["l1"] }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })

    return { store, dispatchedActions }
}

function renderSidebar() {
    const { store, dispatchedActions } = makeStore()
    render(
        <Provider store={store}>
            <LeftSidebar />
        </Provider>,
    )
    return { dispatchedActions }
}

describe("LeftSidebar", () => {
    it("dispatches setActiveSidebarTab when changing to a valid tab", () => {
        const { dispatchedActions } = renderSidebar()

        fireEvent.click(screen.getByRole("tab", { name: /Layers/ }))

        const action = dispatchedActions.find(candidate => appSlice.actions.setActiveSidebarTab.match(candidate))
        expect(action).toBeDefined()
        if (action === undefined || !appSlice.actions.setActiveSidebarTab.match(action)) {
            throw new Error("setActiveSidebarTab action not dispatched")
        }

        expect(action.payload).toBe("layers")
    })
})

describe("StyledTabs", () => {
    it("fills the sidebar height without overflowing it", () => {
        const { container } = renderTabs()
        const root = container.firstElementChild
        if (!root) {
            throw new Error("tabs root not found")
        }
        const style = window.getComputedStyle(root)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(style.height).toBe("100%")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
    })

    it("gives the panel every pixel the tab list leaves over, and no more", () => {
        renderTabs()
        const panel = screen.getByText("panel body").parentElement
        if (!panel) {
            throw new Error("tabs panel not found")
        }
        const style = window.getComputedStyle(panel)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
        expect(Number.parseFloat(style.flexBasis)).toBe(0)
        expect(style.flexGrow).toBe("1")
    })

    it("keeps panel children at full height unless they opt into flexing", () => {
        renderTabs()
        const body = screen.getByText("panel body")
        expect(window.getComputedStyle(body).flexShrink).toBe("0")
    })

    it("keeps the tab list at full height", () => {
        renderTabs()
        const list = screen.getByRole("tablist")
        expect(window.getComputedStyle(list).flexShrink).toBe("0")
    })
})
