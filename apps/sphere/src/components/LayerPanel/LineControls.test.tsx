import { screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { renderWithRecordingStore } from "./controls-test-utils"
import { LineControls } from "./LineControls"

describe("LineControls", () => {
    it("shows the color label with the hex", () => {
        renderWithRecordingStore(<LineControls layerId="l1" color="#00ff00" />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByText("#00ff00")).toBeInTheDocument()
    })
})
