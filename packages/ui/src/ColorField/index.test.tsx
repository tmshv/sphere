import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { ColorField } from "."

describe("ColorField", () => {
    it("shows the label and the current hex", () => {
        render(<ColorField label="Color" value="#ff0000" onChange={vi.fn()} />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByText("#ff0000")).toBeInTheDocument()
    })
})
