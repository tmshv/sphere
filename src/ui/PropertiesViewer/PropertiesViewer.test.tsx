import { render, screen } from "@/test-utils"
import { describe, expect, it } from "vitest"
import { PropertiesViewer } from "./index"

describe("PropertiesViewer", () => {
    it("displays string values", () => {
        render(<PropertiesViewer properties={[{ key: "name", value: "test" }]} />)
        expect(screen.getByText("test")).toBeInTheDocument()
    })

    it("displays boolean true", () => {
        render(<PropertiesViewer properties={[{ key: "active", value: true }]} />)
        expect(screen.getByText("true")).toBeInTheDocument()
    })

    it("displays boolean false", () => {
        render(<PropertiesViewer properties={[{ key: "active", value: false }]} />)
        expect(screen.getByText("false")).toBeInTheDocument()
    })

    it("displays numeric values", () => {
        render(<PropertiesViewer properties={[{ key: "count", value: 42 }]} />)
        expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("displays null as 'null'", () => {
        render(<PropertiesViewer properties={[{ key: "field", value: null }]} />)
        expect(screen.getByText("null")).toBeInTheDocument()
    })

    it("displays zero", () => {
        render(<PropertiesViewer properties={[{ key: "count", value: 0 }]} />)
        expect(screen.getByText("0")).toBeInTheDocument()
    })
})
