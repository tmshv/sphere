import { Surface, Tabs, type TabItem } from "@sphere/ui"
import { IconDatabase, IconSquaresFilled, IconStack } from "@tabler/icons-react"
import type { CSSProperties } from "react"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectActiveSidebarTab } from "@/store/app"
import { isSidebarTab } from "@/lib/sidebar"
import { LayersTab } from "./LayersTab"
import { SourcesTab } from "./SourcesTab"

const ICON_SIZE_PX = 16
const PANEL_WIDTH_PX = 300

const PANEL_STYLE: CSSProperties = {
    width: PANEL_WIDTH_PX,
    overflow: "hidden",
}

const TAB_ITEMS: ReadonlyArray<TabItem> = [
    { value: "sources", label: "Sources", icon: <IconDatabase size={ICON_SIZE_PX} />, content: <SourcesTab /> },
    { value: "layers", label: "Layers", icon: <IconStack size={ICON_SIZE_PX} />, content: <LayersTab /> },
    {
        value: "map-styles",
        label: "Styles",
        icon: <IconSquaresFilled size={ICON_SIZE_PX} />,
        disabled: true,
        content: <Surface style={PANEL_STYLE}>Map Styles</Surface>,
    },
]

export function LeftSidebar() {
    const dispatch = useAppDispatch()
    const activeTab = useAppSelector(selectActiveSidebarTab)

    function handleTabChange(value: string) {
        if (!isSidebarTab(value)) {
            return
        }

        dispatch(actions.app.setActiveSidebarTab(value))
    }

    return <Tabs value={activeTab} onChange={handleTabChange} items={TAB_ITEMS} />
}
