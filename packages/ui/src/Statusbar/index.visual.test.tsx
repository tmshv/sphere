import { IconMap, IconRuler } from "@sphere/icons"
import { page, userEvent } from "vitest/browser"
import { createRef, type ReactNode } from "react"
import { RadioListField } from "../RadioListField"
import { SliderField } from "../SliderField"
import { SwitchField } from "../SwitchField"
import { visualCases } from "../visual/visualCases"
import { Statusbar, StatusbarBadge, StatusbarButton, StatusbarPopover, StatusbarSelect } from "."

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
const POPOVER_ANCHOR_TOP_PX = 400
const POPOVER_ANCHOR_LEFT_PX = 300
const POPOVER_ANCHOR_SIZE_PX = 24
const EXAGGERATION = { value: 1.5, min: 0, max: 3, step: 0.1 }
const SOURCE_OPTIONS = [
    { value: "mapterhorn", label: "Mapterhorn" },
    { value: "dem", label: "dem.mbtiles" },
]

// The anchor sits low and right, as the statusbar button does, so the popover opens above it. The popover must look
// the same in both themes.
function PopoverSubject() {
    const anchor = createRef<HTMLDivElement>()
    return (
        <>
            <div
                ref={anchor}
                style={{
                    position: "fixed",
                    top: POPOVER_ANCHOR_TOP_PX,
                    left: POPOVER_ANCHOR_LEFT_PX,
                    width: POPOVER_ANCHOR_SIZE_PX,
                    height: POPOVER_ANCHOR_SIZE_PX,
                }}
            />
            <StatusbarPopover open anchor={anchor} onClose={noop}>
                <RadioListField label="Source" value="mapterhorn" options={SOURCE_OPTIONS} onChange={noop} />
                <SliderField label="Exaggeration" {...EXAGGERATION} onChange={noop} />
                <SwitchField label="Hillshade" checked onChange={noop} />
            </StatusbarPopover>
        </>
    )
}

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
    popover: {
        render: () => <PopoverSubject />,
        interact: async () => {
            await expect.element(page.getByText("Hillshade")).toBeVisible()
        },
        target: "page",
    },
})
