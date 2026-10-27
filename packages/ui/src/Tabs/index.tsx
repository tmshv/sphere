import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import type { ComponentProps, ReactNode } from "react"
import s from "./tabs.module.css"

export type TabItem = {
    value: string
    label: string
    icon?: ReactNode
    disabled?: boolean
    content: ReactNode
}

export type TabsProps = {
    value: string
    onChange(value: string): void
    items: ReadonlyArray<TabItem>
}

type ListKeyDownEvent = Parameters<NonNullable<ComponentProps<typeof BaseTabs.List>["onKeyDown"]>>[0]

const ENABLED_TAB_SELECTOR = '[role="tab"]:not([aria-disabled="true"])'

type NavigationKey = "ArrowLeft" | "ArrowRight" | "Home" | "End"

const NAVIGATION_KEYS: ReadonlySet<string> = new Set<NavigationKey>(["ArrowLeft", "ArrowRight", "Home", "End"])

function isNavigationKey(key: string): key is NavigationKey {
    return NAVIGATION_KEYS.has(key)
}

// Index of the tab holding the event target, or -1 when focus is elsewhere (the list itself).
function indexOfTabContaining(tabs: ReadonlyArray<HTMLElement>, target: EventTarget): number {
    if (!(target instanceof Node)) {
        return -1
    }
    return tabs.findIndex(tab => tab.contains(target))
}

// Neighbour of `current` in a ring of `count` tabs. From outside the tabs (-1), forward
// lands on the first tab and backward on the last.
function ringNeighbour(current: number, count: number, direction: 1 | -1): number {
    if (current < 0) {
        return direction === 1 ? 0 : count - 1
    }
    return (current + direction + count) % count
}

// Base UI exposes no way to skip disabled tabs: TabsList passes `disabledIndices: EMPTY_ARRAY`
// to its composite (base-ui tabs/list/TabsList.js), so arrows would land on disabled tabs.
// Mantine skipped them, so the list roves over the enabled tabs itself. Do not remove this
// unless Base UI gains a skip-disabled option.
function nextEnabledTab(
    tabs: ReadonlyArray<HTMLElement>,
    current: number,
    key: NavigationKey,
): HTMLElement | undefined {
    switch (key) {
        case "Home":
            return tabs.at(0)
        case "End":
            return tabs.at(-1)
        case "ArrowRight":
            return tabs.at(ringNeighbour(current, tabs.length, 1))
        case "ArrowLeft":
            return tabs.at(ringNeighbour(current, tabs.length, -1))
    }
}

export function Tabs({ value, onChange, items }: TabsProps) {
    function handleValueChange(next: unknown) {
        if (typeof next === "string") {
            onChange(next)
        }
    }

    function handleKeyDown(event: ListKeyDownEvent) {
        if (!isNavigationKey(event.key)) {
            return
        }
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ENABLED_TAB_SELECTOR))
        const target = nextEnabledTab(tabs, indexOfTabContaining(tabs, event.target), event.key)
        if (!target) {
            return
        }
        event.preventDefault()
        event.preventBaseUIHandler?.()
        target.focus()
    }

    return (
        <BaseTabs.Root className={s.root} value={value} onValueChange={handleValueChange}>
            {/* Mantine activates a tab as soon as arrow keys focus it. */}
            <BaseTabs.List className={s.list} activateOnFocus onKeyDown={handleKeyDown}>
                {items.map(item => (
                    <BaseTabs.Tab key={item.value} className={s.tab} value={item.value} disabled={item.disabled}>
                        {item.icon ? <div className={s.icon}>{item.icon}</div> : null}
                        <div>{item.label}</div>
                    </BaseTabs.Tab>
                ))}
            </BaseTabs.List>

            {items.map(item => (
                <BaseTabs.Panel key={item.value} className={s.panel} value={item.value}>
                    {item.content}
                </BaseTabs.Panel>
            ))}
        </BaseTabs.Root>
    )
}
