import { render, screen } from "@/test-utils"
import { makeMvtSource, makeSourceState } from "@/testutils"
import type { TileJSON } from "@/types/tilejson"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { VectorTilesSourcePanel } from "./VectorTilesSourcePanel"

const BASE_TILEJSON: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    attribution: null,
    description: null,
    legend: null,
    name: null,
    template: null,
}

function renderPanel(overrides: Partial<TileJSON>) {
    const tilejson = { ...BASE_TILEJSON, ...overrides }
    const source = makeMvtSource("s1", { tilejson })
    const store = configureStore({
        reducer: {
            source: () => makeSourceState([source], { selectedIds: ["s1"] }),
        },
    })
    return render(
        <Provider store={store}>
            <VectorTilesSourcePanel />
        </Provider>,
    )
}

describe("VectorTilesSourcePanel", () => {
    it("shows the tile metadata and each declared layer with its fields", () => {
        renderPanel({
            minzoom: 2,
            maxzoom: 14,
            vector_layers: [
                { id: "roads", description: "Road network", fields: { name: "String", lanes: "Number" } },
                { id: "water", fields: {} },
            ],
        })

        expect(screen.getByText("Tiles")).toBeInTheDocument()
        expect(screen.getByText("Zoom").parentElement).toHaveTextContent("2–14")
        expect(screen.getByText("Layers")).toBeInTheDocument()
        expect(screen.getByText("roads")).toBeInTheDocument()
        expect(screen.getByText("Road network")).toBeInTheDocument()
        expect(screen.getByText("name").parentElement).toHaveTextContent("String")
        expect(screen.getByText("lanes").parentElement).toHaveTextContent("Number")
        expect(screen.getByText("water")).toBeInTheDocument()
        expect(screen.queryByText("No vector layers declared")).toBeNull()
    })

    it("says so when no vector layers are declared", () => {
        renderPanel({ vector_layers: [] })
        expect(screen.getByText("No vector layers declared")).toBeInTheDocument()
    })
})
