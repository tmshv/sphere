import { type Locator, page, userEvent } from "vitest/browser"
import { afterEach, describe, expect, test } from "vitest"
import type { ReactNode } from "react"
import { flushSync } from "react-dom"
import { type Root, createRoot } from "react-dom/client"
import { ThemeProvider } from "../ThemeProvider"

export type VisualCase = {
    render: () => ReactNode
    /** Hover, focus or open a popup after the first render. */
    interact?: () => Promise<void>
    /** "page" captures the whole viewport, for portalled popups. */
    target?: "subject" | "page"
}

type Theme = "light" | "dark"

const THEMES: ReadonlyArray<Theme> = ["light", "dark"]
const SUBJECT_ID = "visual-subject"
const SUBJECT_WIDTH_PX = 320
const SUBJECT_HEIGHT_PX = 280
const SUBJECT_PADDING_PX = 16
const STYLE_ID = "visual-determinism"

// Screenshots must not depend on timing: no caret blink, no animation frames.
const DETERMINISM_CSS = `
*, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
}
`

function installDeterminismStyle() {
    if (document.getElementById(STYLE_ID)) {
        return
    }
    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = DETERMINISM_CSS
    document.head.append(style)
}

let currentRoot: Root | null = null
let currentHost: HTMLElement | null = null

function unmountCurrent() {
    currentRoot?.unmount()
    currentHost?.remove()
    currentRoot = null
    currentHost = null
}

function mount(node: ReactNode, dark: boolean) {
    installDeterminismStyle()
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    currentRoot = root
    currentHost = host
    flushSync(() => {
        root.render(
            <ThemeProvider dark={dark}>
                <div
                    data-testid={SUBJECT_ID}
                    style={{
                        width: SUBJECT_WIDTH_PX,
                        height: SUBJECT_HEIGHT_PX,
                        padding: SUBJECT_PADDING_PX,
                        boxSizing: "content-box",
                        overflow: "hidden",
                    }}
                >
                    {node}
                </div>
            </ThemeProvider>,
        )
    })
}

// SMIL animations (the loader) ignore the CSS rule above, so stop them at time zero.
function freezeSvgAnimations() {
    for (const svg of document.querySelectorAll("svg")) {
        svg.pauseAnimations()
        svg.setCurrentTime(0)
    }
}

export function visualCases(component: string, cases: Record<string, VisualCase>) {
    describe(component, () => {
        afterEach(async () => {
            unmountCurrent()
            // The pointer stays where the last case left it; park it away from every subject.
            await userEvent.unhover(page.elementLocator(document.body))
        })

        for (const theme of THEMES) {
            for (const [name, visualCase] of Object.entries(cases)) {
                test(`${name} (${theme})`, async () => {
                    mount(visualCase.render(), theme === "dark")
                    await expect.element(page.getByTestId(SUBJECT_ID)).toBeVisible()
                    await visualCase.interact?.()
                    freezeSvgAnimations()
                    const locator =
                        visualCase.target === "page" ? page.elementLocator(document.body) : page.getByTestId(SUBJECT_ID)
                    await expect.element(locator).toMatchScreenshot(`${component}-${name}-${theme}`)
                })
            }
        }
    })
}

/**
 * Focuses an element the way the keyboard does, so :focus-visible styles apply.
 * WebKit never tabs onto buttons, and a bare programmatic focus() after a pointer
 * action does not match :focus-visible. A key press first makes the browser treat
 * the next focus() as keyboard-driven.
 */
export async function focusWithKeyboard(target: Locator) {
    await userEvent.keyboard("{Shift}")
    target.element().focus()
}
