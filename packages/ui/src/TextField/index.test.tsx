import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { TextField } from "."

describe("TextField", () => {
    it("is labelled and reports the new value as a string", () => {
        const onChange = vi.fn()
        render(<TextField label="Name" value="a" onChange={onChange} />)

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "ab" } })

        expect(onChange).toHaveBeenCalledWith("ab")
    })

    it("shows error text and marks the input invalid", () => {
        render(<TextField label="Name" value="" onChange={vi.fn()} error="Too short" />)

        expect(screen.getByText("Too short")).toBeInTheDocument()
        expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true")
    })

    it("code disables spellcheck, autocorrect and autocapitalize", () => {
        render(<TextField label="Expr" value="" onChange={vi.fn()} code />)
        const input = screen.getByLabelText("Expr")

        expect(input).toHaveAttribute("spellcheck", "false")
        expect(input).toHaveAttribute("autocorrect", "off")
        expect(input).toHaveAttribute("autocapitalize", "none")
    })

    it("leaves spellcheck alone without code", () => {
        render(<TextField label="Name" value="" onChange={vi.fn()} />)

        expect(screen.getByLabelText("Name")).not.toHaveAttribute("autocorrect")
    })

    it("required marks the input required", () => {
        render(<TextField label="URL" value="" onChange={vi.fn()} required />)

        expect(screen.getByRole("textbox", { name: /URL/ })).toBeRequired()
    })

    it("renders the right section", () => {
        render(<TextField label="Name" value="" onChange={vi.fn()} rightSection={<span>extra</span>} />)

        expect(screen.getByText("extra")).toBeInTheDocument()
    })
})
