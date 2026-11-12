import { IconPlus } from "@sphere/icons"
import { createColumnHelper } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, test } from "vitest"
import { type Locator, page, userEvent } from "vitest/browser"
import { ActionBar } from "../ActionBar"
import { Button } from "../Button"
import { ErrorFallback } from "../ErrorFallback"
import { PropertesTable, type PropertyItem } from "../PropertiesTable"
import { ThemeProvider } from "../ThemeProvider"
import { pressAndHold as holdPress, releasePress } from "./visualCases"

// Pressed-state pins: a press changes colour only, nothing translates or scales. They assert the computed
// transform in a real browser, with the press asserted to be live (`:active`) before the transform is read.
// The pressed colour itself is pinned by the Button `pressed` screenshot.
const NO_TRANSFORM = "none"
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

// Lets go only of a press this file holds; releasePress moves off first, so Reload App is never clicked.
async function release() {
    if (!held) {
        return
    }
    held = false
    await releasePress()
}

async function pressAndHold(target: Locator): Promise<HTMLElement> {
    await expect.element(target).toBeVisible()
    held = true
    await holdPress(target)
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

    test("PropertiesTable pager button does not move", async () => {
        mount(pager(1))
        const next = await pressAndHold(page.getByRole("button", { name: "Next page" }))
        expect(getComputedStyle(next).transform).toBe(NO_TRANSFORM)
    })

    test("a disabled pager button stays put", async () => {
        mount(pager(PAGE_COUNT - 1))
        const next = page.getByRole("button", { name: "Next page" })
        await expect.element(next).toBeDisabled()
        await userEvent.hover(next, { force: true })
        expect(getComputedStyle(next.element()).transform).toBe(NO_TRANSFORM)
    })
})
