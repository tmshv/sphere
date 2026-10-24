import { screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore } from "./controls-test-utils"
import { PolygonControls } from "./PolygonControls"

describe("PolygonControls", () => {
    it("shows the color label with the hex", () => {
        renderWithRecordingStore(<PolygonControls layerId="l1" color="#00ff00" />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByText("#00ff00")).toBeInTheDocument()
    })
})
