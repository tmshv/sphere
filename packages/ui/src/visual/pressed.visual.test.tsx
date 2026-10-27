import { IconPlus } from "@tabler/icons"
import { createColumnHelper } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, test } from "vitest"
import { commands, type Locator, page, userEvent } from "vitest/browser"
import { ActionBar } from "../ActionBar"
import { Button } from "../Button"
import { ErrorFallback } from "../ErrorFallback"
import { PropertesTable, type PropertyItem } from "../PropertiesTable"
import { ThemeProvider } from "../ThemeProvider"

// Pressed-state pins (R1). They assert the computed transform in a real browser instead of comparing a
// screenshot: WebKit sometimes drops :active while Playwright takes a screenshot, so a pressed baseline
// is not reproducible (two consecutive captures of the same press differ by the 1px shift). The press
// itself is asserted to be live (`:active`) before the transform is read.
//
// Mantine 5 reference: Sphere's theme set `activeStyles: { transform: "none" }`, so ActionBar, Button and
// ErrorFallback never move when pressed. The PropertiesTable footer sat in a nested MantineProvider with
// the default `translateY(1px)`, so its pager buttons do.
const NO_TRANSFORM = "none"
const PRESSED_TRANSFORM = "matrix(1, 0, 0, 1, 0, 1)"
const PAGE_COUNT = 3
const PAGE_SIZE = 25

const noop = () => {}
const error = new Error("Failed to load source")

const columnHelper = createColumnHelper<PropertyItem>()
const COLUMNS = [columnHelper.accessor("name", { header: "name", size: 80 })]

let root: Root | null = null
let host: HTMLElement | null = null
let held = false

function mount(node: ReactNode) {
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
    flushSync(() => {
        root?.render(<ThemeProvider dark={false}>{node}</ThemeProvider>)
    })
}

// Moves off the target before letting go, so releasing never completes a click (Reload App reloads the page).
async function release() {
    if (!held) {
        return
    }
    held = false
    await userEvent.unhover(page.elementLocator(document.body))
    await commands.mouseUp()
}

async function pressAndHold(target: Locator): Promise<HTMLElement> {
    await expect.element(target).toBeVisible()
    await userEvent.hover(target)
    held = true
    await commands.mouseDown()
    await expect.poll(() => target.element().matches(":active")).toBe(true)
    const element = target.element()
    if (!(element instanceof HTMLElement)) {
        throw new Error("The pressed target is not an HTML element")
    }
    return element
}

afterEach(async () => {
    await release()
    root?.unmount()
    host?.remove()
    root = null
    host = null
    await userEvent.unhover(page.elementLocator(document.body))
})

function pager(pageIndex: number) {
    return (
        <div style={{ height: 200, display: "flex", flexDirection: "column" }}>
            <PropertesTable
                data={[{ name: "Berlin" }]}
                columns={COLUMNS}
                meta={{ name: { type: "string", unique: 1 } }}
                pageIndex={pageIndex}
                pageCount={PAGE_COUNT}
                pageSize={PAGE_SIZE}
                pageSizeOptions={[{ value: "25", label: "25" }]}
                attributeFilter="all"
                sorting={[]}
                onPageChange={noop}
                onPageSizeChange={noop}
                onAttributeFilterChange={noop}
                onSortingChange={noop}
            />
        </div>
    )
}

describe("pressed state", () => {
    test("ActionBar action does not move", async () => {
        mount(<ActionBar items={[{ name: "add", label: "Add", icon: IconPlus }]} onClick={noop} />)
        const button = await pressAndHold(page.getByRole("button", { name: "Add" }))
        expect(getComputedStyle(button).transform).toBe(NO_TRANSFORM)
    })

    test("Button does not move", async () => {
        mount(<Button>Save</Button>)
        const button = await pressAndHold(page.getByRole("button", { name: "Save" }))
        expect(getComputedStyle(button).transform).toBe(NO_TRANSFORM)
    })

    test("ErrorFallback buttons do not move", async () => {
        mount(<ErrorFallback error={error} resetErrorBoundary={noop} variant="sidebar" />)
        const retry = await pressAndHold(page.getByRole("button", { name: "Try Again" }))
        expect(getComputedStyle(retry).transform).toBe(NO_TRANSFORM)
        await release()
        const reload = await pressAndHold(page.getByRole("button", { name: "Reload App" }))
        expect(getComputedStyle(reload).transform).toBe(NO_TRANSFORM)
    })

    test("PropertiesTable pager button moves down 1px", async () => {
        mount(pager(1))
        const next = await pressAndHold(page.getByRole("button", { name: "Next page" }))
        expect(getComputedStyle(next).transform).toBe(PRESSED_TRANSFORM)
    })

    test("a disabled pager button stays put", async () => {
        mount(pager(PAGE_COUNT - 1))
        const next = page.getByRole("button", { name: "Next page" })
        await expect.element(next).toBeDisabled()
        await userEvent.hover(next, { force: true })
        expect(getComputedStyle(next.element()).transform).toBe(NO_TRANSFORM)
    })
})
