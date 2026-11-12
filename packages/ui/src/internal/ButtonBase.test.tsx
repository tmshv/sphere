import { describe, expect, it, vi } from "vitest"
import { declaredStyle, expectDesktopInteraction, fireEvent, focusVisibleStyle, render, screen } from "../test-utils"
import { ButtonBase, type ButtonShape } from "./ButtonBase"

const SHAPES: ReadonlyArray<ButtonShape> = ["push", "glyph", "bordered-glyph", "plain"]
const LABEL = "Measure"
const TEXT = "Save"
const CONTROLLED_ID = "section-body"
const DISABLED_OPACITY = "var(--sphere-opacity-disabled)"
const ACCENT_GLYPH = "var(--sphere-color-accent-glyph)"
const CONTROL_BODY = "var(--sphere-color-control)"
const PRESSED_BODY = "var(--sphere-color-control-pressed)"
const ZERO_SPECIFICITY = /^:where\(/
const WHITESPACE = /\s+/g
const FOCUS_RING = "0 0 0 var(--button-focus-ring-width) var(--sphere-color-focus-ring)"
// Text properties a browser's own button style sets, so a header's uppercase would not reach the button inside.
const INHERITED_TEXT = ["text-transform", "letter-spacing", "word-spacing", "text-indent"]

describe("ButtonBase", () => {
    for (const shape of SHAPES) {
        it(`renders the ${shape} shape with the desktop interaction model`, () => {
            render(<ButtonBase shape={shape}>{TEXT}</ButtonBase>)
            const button = screen.getByRole("button", { name: TEXT })
            expect(button).toHaveAttribute("data-shape", shape)
            expectDesktopInteraction(button)
        })
    }

    it("defaults to size md, the secondary tone and type=button", () => {
        render(<ButtonBase shape="push">{TEXT}</ButtonBase>)
        const button = screen.getByRole("button", { name: TEXT })
        expect(button).toHaveAttribute("data-size", "md")
        expect(button).toHaveAttribute("data-tone", "secondary")
        expect(button).toHaveAttribute("type", "button")
    })

    it("passes size and tone through as data attributes", () => {
        render(
            <ButtonBase shape="push" size="sm" tone="primary">
                {TEXT}
            </ButtonBase>,
        )
        const button = screen.getByRole("button", { name: TEXT })
        expect(button).toHaveAttribute("data-size", "sm")
        expect(button).toHaveAttribute("data-tone", "primary")
    })

    it("names the button by label and shows it as the title", () => {
        render(
            <ButtonBase shape="glyph" label={LABEL}>
                <svg />
            </ButtonBase>,
        )
        expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("title", LABEL)
    })

    it("keeps the name but drops the title when nativeTooltip is false", () => {
        render(
            <ButtonBase shape="glyph" label={LABEL} nativeTooltip={false}>
                <svg />
            </ButtonBase>,
        )
        const button = screen.getByRole("button", { name: LABEL })
        expect(button).not.toHaveAttribute("title")
    })

    it("sets aria-pressed only when active is defined", () => {
        const { rerender } = render(<ButtonBase shape="glyph">{TEXT}</ButtonBase>)
        expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed")
        expect(screen.getByRole("button")).not.toHaveAttribute("data-active")

        rerender(
            <ButtonBase shape="glyph" active={false}>
                {TEXT}
            </ButtonBase>,
        )
        expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
        expect(screen.getByRole("button")).not.toHaveAttribute("data-active")

        rerender(
            <ButtonBase shape="glyph" active>
                {TEXT}
            </ButtonBase>,
        )
        expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button")).toHaveAttribute("data-active")
    })

    it("exposes a disclosure state and what it controls", () => {
        const { rerender } = render(<ButtonBase shape="plain">{TEXT}</ButtonBase>)
        expect(screen.getByRole("button")).not.toHaveAttribute("aria-expanded")
        expect(screen.getByRole("button")).not.toHaveAttribute("aria-controls")

        rerender(
            <ButtonBase shape="plain" expanded controls={CONTROLLED_ID}>
                {TEXT}
            </ButtonBase>,
        )
        expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("button")).toHaveAttribute("aria-controls", CONTROLLED_ID)
    })

    it("calls onClick", () => {
        const onClick = vi.fn()
        render(
            <ButtonBase shape="push" onClick={onClick}>
                {TEXT}
            </ButtonBase>,
        )
        fireEvent.click(screen.getByRole("button"))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn()
        render(
            <ButtonBase shape="push" disabled onClick={onClick}>
                {TEXT}
            </ButtonBase>,
        )
        const button = screen.getByRole("button")
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    it("submits its form when type=submit", () => {
        const onSubmit = vi.fn(event => event.preventDefault())
        render(
            <form onSubmit={onSubmit}>
                <ButtonBase shape="push" type="submit">
                    {TEXT}
                </ButtonBase>
            </form>,
        )
        fireEvent.click(screen.getByRole("button"))
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it("colours an active glyph with the accent glyph colour", () => {
        render(
            <ButtonBase shape="glyph" active>
                {TEXT}
            </ButtonBase>,
        )
        expect(declaredStyle(screen.getByRole("button"), "color")).toBe(ACCENT_GLYPH)
    })

    it("reads a bordered glyph as disabled, not active, when both are set", () => {
        render(
            <ButtonBase shape="bordered-glyph" active disabled>
                {TEXT}
            </ButtonBase>,
        )
        const button = screen.getByRole("button")
        expect(button).toHaveAttribute("data-active")
        expect(declaredStyle(button, "opacity")).toBe(DISABLED_OPACITY)
        expect(declaredStyle(button, "background-color")).toBe(CONTROL_BODY)
        expect(declaredStyle(button, "color")).not.toBe(ACCENT_GLYPH)
    })

    it("draws a toggled-on bordered glyph on the pressed body", () => {
        render(
            <ButtonBase shape="bordered-glyph" active>
                {TEXT}
            </ButtonBase>,
        )
        const button = screen.getByRole("button")
        expect(declaredStyle(button, "background-color")).toBe(PRESSED_BODY)
        expect(declaredStyle(button, "color")).toBe(ACCENT_GLYPH)
    })

    it("resets with zero specificity, so a layout className wins in any stylesheet order", () => {
        render(<ButtonBase shape="plain">{TEXT}</ButtonBase>)
        const button = screen.getByRole("button")
        const resets = [...document.styleSheets]
            .flatMap(sheet => [...sheet.cssRules])
            .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
            .filter(rule => button.matches(rule.selectorText) && rule.style.getPropertyValue("padding") !== "")
        expect(resets.length).toBeGreaterThan(0)
        for (const rule of resets) {
            expect(rule.selectorText).toMatch(ZERO_SPECIFICITY)
        }
    })

    it("reads as disabled, not active, when both are set", () => {
        render(
            <ButtonBase shape="glyph" active disabled>
                {TEXT}
            </ButtonBase>,
        )
        const button = screen.getByRole("button")
        expect(button).toHaveAttribute("data-active")
        expect(declaredStyle(button, "opacity")).toBe(DISABLED_OPACITY)
        expect(declaredStyle(button, "color")).not.toBe(ACCENT_GLYPH)
    })

    it("draws the focus ring as a glow, never an outline", () => {
        render(<ButtonBase shape="glyph">{TEXT}</ButtonBase>)
        const button = screen.getByRole("button")
        expect(focusVisibleStyle(button, "box-shadow")).toBe(FOCUS_RING)
        expect(focusVisibleStyle(button, "outline-style")).toBe("none")
    })

    it("draws the plain shape's focus ring inside, so a strip that fills a clipping container keeps it", () => {
        render(<ButtonBase shape="plain">{TEXT}</ButtonBase>)
        expect(focusVisibleStyle(screen.getByRole("button"), "box-shadow")).toBe(`inset ${FOCUS_RING}`)
    })

    it("inherits the text case and spacing of its container, which the browser's button style resets", () => {
        render(<ButtonBase shape="plain">{TEXT}</ButtonBase>)
        const button = screen.getByRole("button")
        for (const property of INHERITED_TEXT) {
            expect(declaredStyle(button, property), property).toBe("inherit")
        }
    })

    it("keeps the push button hairline shadow under the focus ring", () => {
        render(<ButtonBase shape="push">{TEXT}</ButtonBase>)
        expect(focusVisibleStyle(screen.getByRole("button"), "box-shadow").replace(WHITESPACE, " ")).toBe(
            `var(--sphere-shadow-control), ${FOCUS_RING}`,
        )
    })
})
