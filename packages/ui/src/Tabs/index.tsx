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
const LAST_STEP = -1

type NavigationKey = "ArrowLeft" | "ArrowRight" | "Home" | "End"

// How far each key moves from the focused tab; Home and End jump to an end.
const STEP: Record<NavigationKey, number | "first" | "last"> = {
    ArrowLeft: LAST_STEP,
    ArrowRight: 1,
    Home: "first",
    End: "last",
}

function isNavigationKey(key: string): key is NavigationKey {
    return key in STEP
}

// Base UI keeps disabled tabs in the arrow-key order; Mantine skipped them, so the list
// does its own roving over the enabled tabs.
function nextEnabledTab(
    tabs: ReadonlyArray<HTMLElement>,
    current: number,
    key: NavigationKey,
): HTMLElement | undefined {
    const step = STEP[key]
    if (step === "first") {
        return tabs.at(0)
    }
    if (step === "last") {
        return tabs.at(-1)
    }
    return tabs.at((current + step + tabs.length) % tabs.length)
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
        const target = nextEnabledTab(
            tabs,
            tabs.findIndex(tab => tab === document.activeElement),
            event.key,
        )
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
