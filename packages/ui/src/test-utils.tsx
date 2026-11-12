import { type RenderOptions, render } from "@testing-library/react"
import type React from "react"
import { expect } from "vitest"
import { ThemeProvider } from "./ThemeProvider"
import { replaceState } from "./selector-list"

function AllProviders({ children }: { children: React.ReactNode }) {
    return <ThemeProvider dark={false}>{children}</ThemeProvider>
}

function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return render(ui, { wrapper: AllProviders, ...options })
}

export * from "@testing-library/react"
export { customRender as render }

// getComputedStyle in happy-dom drops declarations whose value is a var(),
// such as spacing tokens. This reads the value as written in the matching
// stylesheet rule instead. It takes the last matching rule in document order
// and ignores specificity and media queries.
export function declaredStyle(element: Element, property: string): string {
    const values = [...document.styleSheets]
        .flatMap(sheet => [...sheet.cssRules])
        .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && element.matches(rule.selectorText))
        .map(rule => rule.style.getPropertyValue(property))
        .filter(value => value !== "")

    return values.at(-1) ?? ""
}

// Style rules of a stylesheet, including those inside @media and @supports blocks, so a state rule written for
// one kind of pointer is still found.
function styleRules(rules: CSSRuleList): CSSStyleRule[] {
    return [...rules].flatMap(rule => {
        if (rule instanceof CSSStyleRule) {
            return [rule]
        }
        if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
            return styleRules(rule.cssRules)
        }
        return []
    })
}

// The selectors of a rule that style the state itself, with the state removed so they can be matched against an
// element that is not in it.
function stateSelectors(selectorText: string, pseudoClass: string): string[] {
    return replaceState(selectorText, pseudoClass, "").map(selector => selector || "*")
}

// The value a property takes in the given state: it reads rules whose selector contains the pseudo-class (or state
// attribute), matching the element as if it were not in that state. Returns "" when no rule sets it. Rules that
// exclude the state with `:not(…)` are skipped.
export function stateStyle(element: Element, property: string, pseudoClass: string): string {
    const values = [...document.styleSheets]
        .flatMap(sheet => styleRules(sheet.cssRules))
        .filter(rule => stateSelectors(rule.selectorText, pseudoClass).some(selector => element.matches(selector)))
        .map(rule => rule.style.getPropertyValue(property))
        .filter(value => value !== "")

    return values.at(-1) ?? ""
}

const ACTIVE = ":active"
const HOVER = ":hover"
const FOCUS_VISIBLE = ":focus-visible"

// Like declaredStyle, for the value a property takes while the element is pressed (`:active`).
export function pressedStyle(element: Element, property: string): string {
    return stateStyle(element, property, ACTIVE)
}

// Like declaredStyle, for the value a property takes while the pointer is over the element (`:hover`).
export function hoverStyle(element: Element, property: string): string {
    return stateStyle(element, property, HOVER)
}

// Like declaredStyle, for the value a property takes while the element has keyboard focus (`:focus-visible`).
export function focusVisibleStyle(element: Element, property: string): string {
    return stateStyle(element, property, FOCUS_VISIBLE)
}

const STARTING_STYLE = "[data-starting-style]"

// Like declaredStyle, for the value a property takes while a Base UI popup is entering (`[data-starting-style]`).
export function startingStyle(element: Element, property: string): string {
    return stateStyle(element, property, STARTING_STYLE)
}

const DESKTOP_CURSOR = "default"
const FOCUS_RING = "var(--sphere-color-focus-ring)"
// What a hover rule could change to look like a web control; none of them may change on a desktop control.
const HOVER_PROPERTIES = ["background-color", "color", "border-color", "box-shadow"]

// Pins the desktop interaction model on a button-like element: the arrow cursor, nothing moves when pressed,
// the pointer passing over it changes nothing, and keyboard focus still draws the focus-ring glow.
export function expectDesktopInteraction(element: Element): void {
    expect(declaredStyle(element, "cursor")).toBe(DESKTOP_CURSOR)
    expect(pressedStyle(element, "transform")).toBe("")
    for (const property of HOVER_PROPERTIES) {
        expect(hoverStyle(element, property), `${property} on hover`).toBe("")
    }
    expect(focusVisibleStyle(element, "box-shadow")).toContain(FOCUS_RING)
}
