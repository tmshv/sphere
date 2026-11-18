import { describe, expect, it, vi } from "vitest"
import { declaredStyle, fireEvent, render, screen, stateStyle } from "../test-utils"
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

    it("calls onBlur when the input loses focus", () => {
        const onBlur = vi.fn()
        render(<TextField label="Name" value="" onChange={vi.fn()} onBlur={onBlur} />)
        const input = screen.getByLabelText("Name")

        fireEvent.focus(input)
        fireEvent.blur(input)

        expect(onBlur).toHaveBeenCalledTimes(1)
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

    it("is a bordered field with the control radius, the desktop height and a focus ring on any focus", () => {
        render(<TextField label="Name" value="" onChange={vi.fn()} />)
        const field = screen.getByLabelText("Name")

        expect(declaredStyle(field, "border-radius")).toBe("var(--sphere-radius-control)")
        expect(declaredStyle(field, "background-color")).toBe("var(--sphere-color-content)")
        expect(declaredStyle(field, "height")).toBe("var(--sphere-control-height-md)")
        expect(declaredStyle(field, "cursor")).toBe("text")
        expect(stateStyle(field, "box-shadow", ":focus")).toContain("var(--sphere-color-focus-ring)")
    })

    it("draws the label small and secondary, and the error in the danger colour", () => {
        render(<TextField label="Name" value="" onChange={vi.fn()} error="Too short" />)

        expect(declaredStyle(screen.getByText("Name"), "color")).toBe("var(--sphere-color-label-secondary)")
        expect(declaredStyle(screen.getByText("Too short"), "color")).toBe("var(--sphere-color-danger)")
    })
})
