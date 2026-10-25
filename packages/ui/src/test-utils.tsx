import { type RenderOptions, render } from "@testing-library/react"
import type React from "react"
import { ThemeProvider } from "./ThemeProvider"

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
