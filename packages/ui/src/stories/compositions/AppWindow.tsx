import { type ReactNode, useState } from "react"
import { AppLayout } from "../../AppLayout"
import { SegmentedControl } from "../../Select"
import { Statusbar, StatusbarBadge, StatusbarButton, StatusbarSelect } from "../../Statusbar"
import {
    MAP_TOOL_DEFAULT,
    MAP_TOOL_LABEL,
    MAP_TOOL_OPTIONS,
    STATUSBAR_BADGE_TEXT,
    STATUSBAR_BADGE_TITLE,
    STATUSBAR_COORDINATE_BADGES,
    STATUSBAR_NORTH_GLYPH,
    STATUSBAR_NORTH_LABEL,
    STATUSBAR_SELECT_OPTIONS,
    STATUSBAR_SIDEBAR_GLYPH,
    STATUSBAR_SIDEBAR_LABEL,
    STATUSBAR_VERSION,
} from "../fixtures"
import { mapAreaStyle, mapToolbarStyle, statusbarSpacerStyle, WINDOW_SIDEBAR_SIZE, windowFrameStyle } from "../layout"
import { MapPlaceholder } from "./MapPlaceholder"
import { SidebarContent } from "./SidebarContent"

type AppWindowProps = {
    /** Rendered inside the window frame after the layout, for overlays that anchor to it. */
    children?: ReactNode
    sidebar?: boolean
}

/** The main window: sidebar, map placeholder with the map tool over it, and the statusbar. */
export function AppWindow({ children, sidebar = true }: AppWindowProps) {
    const [sidebarOpen, setSidebarOpen] = useState(sidebar)
    const [tool, setTool] = useState(MAP_TOOL_DEFAULT)
    const [filter, setFilter] = useState(STATUSBAR_SELECT_OPTIONS.at(0)?.value ?? "")

    const footer = (
        <Statusbar>
            <StatusbarButton
                icon={STATUSBAR_SIDEBAR_GLYPH}
                label={STATUSBAR_SIDEBAR_LABEL}
                active={sidebarOpen}
                onClick={() => setSidebarOpen(open => !open)}
            />
            <StatusbarBadge title={STATUSBAR_BADGE_TITLE}>{STATUSBAR_BADGE_TEXT}</StatusbarBadge>
            {STATUSBAR_COORDINATE_BADGES.map(badge => (
                <StatusbarBadge key={badge.title} title={badge.title}>
                    {badge.text}
                </StatusbarBadge>
            ))}
            <div style={statusbarSpacerStyle} />
            {MAP_TOOL_OPTIONS.map(option => (
                <StatusbarButton
                    key={option.value}
                    icon={option.icon}
                    label={option.label}
                    active={tool === option.value}
                    onClick={() => setTool(option.value)}
                />
            ))}
            <StatusbarButton icon={STATUSBAR_NORTH_GLYPH} label={STATUSBAR_NORTH_LABEL} onClick={() => undefined} />
            <StatusbarSelect value={filter} options={[...STATUSBAR_SELECT_OPTIONS]} onChange={setFilter} />
            <StatusbarBadge>{STATUSBAR_VERSION}</StatusbarBadge>
        </Statusbar>
    )

    return (
        <div style={windowFrameStyle}>
            <AppLayout
                footer={footer}
                leftSidebar={sidebarOpen ? <SidebarContent /> : undefined}
                leftSidebarSize={WINDOW_SIDEBAR_SIZE}
            >
                <div style={mapAreaStyle}>
                    <MapPlaceholder />
                    <div style={mapToolbarStyle}>
                        <SegmentedControl
                            label={MAP_TOOL_LABEL}
                            size="sm"
                            options={MAP_TOOL_OPTIONS}
                            value={tool}
                            onChange={setTool}
                        />
                    </div>
                </div>
            </AppLayout>
            {children}
        </div>
    )
}
