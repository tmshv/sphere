import { ThemeProvider } from "@sphere/ui"
import { type RenderOptions, render, screen } from "@testing-library/react"
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

/**
 * The body of the sidebar section whose header is labelled `title`, found through the header's
 * `aria-controls`. Throws when the section is closed or missing.
 */
export function sectionBodyOf(title: RegExp): HTMLElement {
    const header = screen.getByRole("button", { name: title })
    const bodyId = header.getAttribute("aria-controls")
    const body = bodyId === null ? null : document.getElementById(bodyId)
    if (!body) {
        throw new Error(`no open section body for ${title}`)
    }
    return body
}

/** The computed top and bottom padding of `element`, in pixels. */
export function verticalPaddingOf(element: Element): [number, number] {
    const style = window.getComputedStyle(element)
    return [Number.parseFloat(style.paddingTop), Number.parseFloat(style.paddingBottom)]
}
