import { makeMvtSource, makeSourceState } from "@/testutils"
import { render, screen } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { FolderPanel } from "./FolderPanel"
import { SourceLayerPanel } from "./SourceLayerPanel"

const MVT_ID = "m1"

function makeStore(sourceLayerIds: string[], selectedId: string, folderIds: string[] = []) {
    const mvt = makeMvtSource(MVT_ID, {
        tilejson: {
            vector_layers: [
                { id: "roads", description: "Road network", fields: { highway: "String" } },
                { id: "water", fields: { depth: "Number" } },
            ],
        },
        sourceLayers: sourceLayerIds.map(id => ({ id, name: id })),
    })
    return configureStore({
        reducer: {
            source: () => makeSourceState([mvt], { selectedIds: [selectedId], folderIds }),
        },
    })
}

describe("SourceLayerPanel", () => {
    it("shows the fields of the selected layer only", () => {
        render(
            <Provider store={makeStore(["roads", "water"], `${MVT_ID}/roads`)}>
                <SourceLayerPanel />
            </Provider>,
        )
        expect(screen.getByText("roads")).toBeInTheDocument()
        expect(screen.getByText("Road network")).toBeInTheDocument()
        expect(screen.getByText("highway")).toBeInTheDocument()
        expect(screen.queryByText("water")).not.toBeInTheDocument()
        expect(screen.queryByText("depth")).not.toBeInTheDocument()
    })

    it("says so when the tilejson has no entry for the layer", () => {
        render(
            <Provider store={makeStore(["roads", "rail"], `${MVT_ID}/rail`)}>
                <SourceLayerPanel />
            </Provider>,
        )
        expect(screen.getByText("No metadata for this layer")).toBeInTheDocument()
    })
})

describe("FolderPanel", () => {
    it("shows the number of children", () => {
        render(
            <Provider store={makeStore([], "f1", ["f1"])}>
                <FolderPanel />
            </Provider>,
        )
        expect(screen.getByText("Items")).toBeInTheDocument()
        expect(screen.getByText("0")).toBeInTheDocument()
    })
})
