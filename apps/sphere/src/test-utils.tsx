import { ThemeProvider } from "@sphere/ui"
import { type RenderOptions, render } from "@testing-library/react"
import type React from "react"

function AllProviders({ children }: { children: React.ReactNode }) {
    return <ThemeProvider dark={false}>{children}</ThemeProvider>
}

function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return render(ui, { wrapper: AllProviders, ...options })
}

export * from "@testing-library/react"
export { customRender as render }

/**
 * The nearest ancestor of `element` that scrolls vertically, or `null`. Outline trees scroll through
 * react-window, which sets the `overflow` shorthand inline; happy-dom does not expand that into
 * `overflowY`, so both are checked.
 */
export function scrollParentOf(element: Element): HTMLElement | null {
    let node = element.parentElement
    while (node) {
        const style = window.getComputedStyle(node)
        if (style.overflowY === "auto" || style.overflow === "auto") {
            return node
        }
        node = node.parentElement
    }
    return null
}
