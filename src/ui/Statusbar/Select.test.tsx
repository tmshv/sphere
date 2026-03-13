// @vitest-environment happy-dom
import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { Select } from "./Select"

describe("Select", () => {
    it("renders an option for each value", () => {
        render(<Select value={50} options={[50, 100, 500]} onChange={vi.fn()} />)
        const options = screen.getAllByRole("option")
        expect(options).toHaveLength(3)
        expect(options[0]).toHaveValue("50")
        expect(options[1]).toHaveValue("100")
        expect(options[2]).toHaveValue("500")
    })

    it("shows the current value as selected", () => {
        render(<Select value={100} options={[50, 100, 500]} onChange={vi.fn()} />)
        const select = screen.getByRole("combobox")
        expect(select).toHaveValue("100")
    })

    it("calls onChange with numeric value when selection changes", () => {
        const onChange = vi.fn()
        render(<Select value={50} options={[50, 100, 500]} onChange={onChange} />)
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "500" } })
        expect(onChange).toHaveBeenCalledWith(500)
    })

    it("applies className to the select element", () => {
        render(<Select value={50} options={[50]} onChange={vi.fn()} className="my-class" />)
        expect(screen.getByRole("combobox")).toHaveClass("my-class")
    })
})
