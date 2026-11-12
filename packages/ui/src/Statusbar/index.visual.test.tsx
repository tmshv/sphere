import { IconMap, IconRuler } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import type { ReactNode } from "react"
import { visualCases } from "../visual/visualCases"
import { Statusbar, StatusbarBadge, StatusbarButton, StatusbarSelect } from "."

const noop = () => {}
const ICON_SIZE = 14
const SELECT_OPTIONS = [
    { value: "all", label: "All" },
    { value: "selection", label: "Selection" },
]

function Bars({ children }: { children: ReactNode }) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
}

const icon = <IconMap size={ICON_SIZE} />

function ButtonStates() {
    return (
        <Statusbar>
            <StatusbarButton icon={icon} label="Idle" onClick={noop} />
            <StatusbarButton icon={icon} label="Active" onClick={noop} active />
            <StatusbarButton icon={icon} label="Active fill" onClick={noop} active activeLook="fill" />
            <StatusbarButton icon={icon} label="Disabled" onClick={noop} disabled />
            <StatusbarButton
                icon={<IconRuler size={ICON_SIZE} />}
                label="Inactive pressed"
                onClick={noop}
                active={false}
            />
        </Statusbar>
    )
}

visualCases("Statusbar", {
    default: {
        render: () => (
            <Statusbar>
                <StatusbarButton icon={icon} label="Basemap" onClick={noop} />
                <StatusbarBadge title="Zoom">z 12.4</StatusbarBadge>
                <StatusbarBadge tone="error">1 error</StatusbarBadge>
                <StatusbarSelect value="all" options={SELECT_OPTIONS} onChange={noop} />
            </Statusbar>
        ),
    },
    "buttons-states": { render: () => <ButtonStates /> },
    // Renders exactly what buttons-states renders: the pointer over a button must change nothing.
    "button-hover": {
        render: () => <ButtonStates />,
        interact: () => userEvent.hover(page.getByRole("button", { name: "Idle" })),
    },
    "badge-widths": {
        render: () => (
            <Bars>
                <Statusbar>
                    <StatusbarBadge>auto</StatusbarBadge>
                    <StatusbarBadge width="short">short</StatusbarBadge>
                </Statusbar>
                <Statusbar>
                    <StatusbarBadge width="long">long width</StatusbarBadge>
                </Statusbar>
            </Bars>
        ),
    },
    "badge-tones": {
        render: () => (
            <Statusbar>
                <StatusbarBadge width="short">default</StatusbarBadge>
                <StatusbarBadge width="short" tone="error">
                    error
                </StatusbarBadge>
            </Statusbar>
        ),
    },
    select: {
        render: () => (
            <Statusbar>
                <StatusbarSelect value="selection" options={SELECT_OPTIONS} onChange={noop} />
            </Statusbar>
        ),
    },
})
