import { render, screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { PanelSection } from "./PanelSection"

describe("PanelSection", () => {
    it("renders its title above its content", () => {
        render(
            <PanelSection title={"File"}>
                <div>section body</div>
            </PanelSection>,
        )
        expect(screen.getByText("File")).toBeInTheDocument()
        expect(screen.getByText("section body")).toBeInTheDocument()
    })

    it("keeps the title out of a selection, so dragging picks up values only", () => {
        render(
            <PanelSection title={"Attributes"}>
                <div>section body</div>
            </PanelSection>,
        )
        expect(window.getComputedStyle(screen.getByText("Attributes")).userSelect).toBe("none")
    })
})
