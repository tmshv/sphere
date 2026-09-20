import type { SidebarTab } from "@/types"

// Keyed off SidebarTab itself, so adding a tab to the union without adding
// it here fails to compile instead of silently rotting.
const SIDEBAR_TABS: Record<SidebarTab, true> = { sources: true, layers: true }

export function isSidebarTab(value: string | null): value is SidebarTab {
    return value !== null && Object.hasOwn(SIDEBAR_TABS, value)
}
