import { IconMap, IconRuler } from "@tabler/icons-react"
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

visualCases("Statusbar", {
    "buttons-states": {
        render: () => (
            <Statusbar>
                <StatusbarButton icon={icon} label="Idle" onClick={noop} />
                <StatusbarButton icon={icon} label="Active accent" onClick={noop} active />
                <StatusbarButton icon={icon} label="Active fill" onClick={noop} active activeLook="fill" />
                <StatusbarButton icon={icon} label="Disabled" onClick={noop} disabled />
                <StatusbarButton
                    icon={<IconRuler size={ICON_SIZE} />}
                    label="Inactive pressed"
                    onClick={noop}
                    active={false}
                />
            </Statusbar>
        ),
    },
    "button-hover": {
        render: () => (
            <Statusbar>
                <StatusbarButton icon={icon} label="Hover me" onClick={noop} />
            </Statusbar>
        ),
        interact: () => userEvent.hover(page.getByRole("button", { name: "Hover me" })),
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
