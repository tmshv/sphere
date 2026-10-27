import { IconDatabase, IconStack } from "@sphere/icons"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, test } from "vitest"
import { ThemeProvider } from "../ThemeProvider"
import { visualCases } from "../visual/visualCases"
import { type TabItem, Tabs } from "."

const noop = () => {}
const ICON_SIZE = 14

const ITEMS: ReadonlyArray<TabItem> = [
    { value: "sources", label: "Sources", icon: <IconDatabase size={ICON_SIZE} />, content: <div>Sources panel</div> },
    { value: "layers", label: "Layers", icon: <IconStack size={ICON_SIZE} />, content: <div>Layers panel</div> },
    { value: "styles", label: "Styles", disabled: true, content: <div>Styles panel</div> },
]

visualCases("Tabs", {
    "first-active": { render: () => <Tabs value="sources" onChange={noop} items={ITEMS} /> },
    "second-active": { render: () => <Tabs value="layers" onChange={noop} items={ITEMS} /> },
})

// The layout contract the sidebar relies on, read from the real stylesheet.
describe("Tabs layout", () => {
    let host = document.createElement("div")
    let root = createRoot(host)

    afterEach(() => {
        root.unmount()
        host.remove()
    })

    function mountTabs() {
        host = document.createElement("div")
        root = createRoot(host)
        document.body.append(host)
        flushSync(() => {
            root.render(
                <ThemeProvider dark={false}>
                    <Tabs value="sources" onChange={noop} items={ITEMS} />
                </ThemeProvider>,
            )
        })
    }

    function style(element: Element | null) {
        if (!element) {
            throw new Error("element not found")
        }
        return window.getComputedStyle(element)
    }

    test("fills the sidebar height without overflowing it", () => {
        mountTabs()
        const rootStyle = style(host.querySelector("div"))

        expect(rootStyle.display).toBe("flex")
        expect(rootStyle.flexDirection).toBe("column")
        expect(rootStyle.overflow).toBe("hidden")
        expect(Number.parseFloat(rootStyle.minHeight)).toBe(0)
    })

    test("gives the panel every pixel the tab list leaves over, and no more", () => {
        mountTabs()
        const panel = style(host.querySelector('[role="tabpanel"]'))

        expect(panel.display).toBe("flex")
        expect(panel.flexDirection).toBe("column")
        expect(panel.overflow).toBe("hidden")
        expect(panel.flexGrow).toBe("1")
        expect(Number.parseFloat(panel.flexBasis)).toBe(0)
        expect(Number.parseFloat(panel.minHeight)).toBe(0)
    })

    test("keeps panel children and the tab list at full height", () => {
        mountTabs()

        expect(style(host.querySelector('[role="tabpanel"] > *')).flexShrink).toBe("0")
        expect(style(host.querySelector('[role="tablist"]')).flexShrink).toBe("0")
    })
})
