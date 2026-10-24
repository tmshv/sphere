import { render, screen } from "@/test-utils"
import type { TileJSON } from "@/types/tilejson"
import { describe, expect, it } from "vitest"
import { TileJsonSection } from "./TileJsonSection"

const BASE_TILEJSON: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    attribution: null,
    description: null,
    legend: null,
    name: null,
    template: null,
}

describe("TileJsonSection", () => {
    it("says so when there is no tile metadata", () => {
        render(<TileJsonSection tilejson={null} />)

        expect(screen.getByText("Tiles")).toBeInTheDocument()
        expect(screen.getByText("No tile metadata")).toBeInTheDocument()
    })

    it("falls back to the default zoom range and hides absent fields", () => {
        render(<TileJsonSection tilejson={BASE_TILEJSON} />)

        expect(screen.getByText("Zoom").parentElement).toHaveTextContent("0–22")
        expect(screen.queryByText("Format")).toBeNull()
        expect(screen.queryByText("Bounds")).toBeNull()
        expect(screen.queryByText("Attribution")).toBeNull()
    })

    it("shows every field the metadata declares", () => {
        render(
            <TileJsonSection
                tilejson={{
                    ...BASE_TILEJSON,
                    format: "pbf",
                    minzoom: 3,
                    maxzoom: 9,
                    bounds: [-10, -20, 10, 20],
                    center: [0, 1],
                    scheme: "xyz",
                    version: "1.0.0",
                    attribution: "Somebody",
                    description: "A tileset",
                }}
            />,
        )

        expect(screen.getByText("Format").parentElement).toHaveTextContent("pbf")
        expect(screen.getByText("Zoom").parentElement).toHaveTextContent("3–9")
        expect(screen.getByText("Bounds").parentElement).toHaveTextContent("-10, -20, 10, 20")
        expect(screen.getByText("Center").parentElement).toHaveTextContent("0, 1")
        expect(screen.getByText("Scheme").parentElement).toHaveTextContent("xyz")
        expect(screen.getByText("Version").parentElement).toHaveTextContent("1.0.0")
        expect(screen.getByText("Attribution").parentElement).toHaveTextContent("Somebody")
        expect(screen.getByText("Description").parentElement).toHaveTextContent("A tileset")
    })
})
