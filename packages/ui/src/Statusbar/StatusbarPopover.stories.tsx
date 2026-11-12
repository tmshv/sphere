import type { Meta, StoryObj } from "@storybook/react-vite"
import { useRef } from "react"
import { fn } from "storybook/test"
import { RadioListField } from "../RadioListField"
import { SliderField } from "../SliderField"
import { SwitchField } from "../SwitchField"
import {
    RADIO_LIST_LABEL,
    RADIO_LIST_OPTIONS,
    SLIDER_LABEL,
    SLIDER_MAX,
    SLIDER_MIN,
    SLIDER_STEP,
    SLIDER_VALUE,
    SWITCH_LABEL,
} from "../stories/fixtures"
import { overlayFrameStyle, popoverAnchorStyle } from "../stories/layout"
import { StatusbarPopover, type StatusbarPopoverProps } from "."

type StatusbarPopoverDemoProps = Omit<StatusbarPopoverProps, "anchor">

// The anchor stands in for the statusbar button the popover opens above.
function StatusbarPopoverDemo({ open, onClose, children }: StatusbarPopoverDemoProps) {
    const anchor = useRef<HTMLDivElement>(null)

    return (
        <div style={overlayFrameStyle}>
            <div ref={anchor} style={popoverAnchorStyle} />
            <StatusbarPopover open={open} anchor={anchor} onClose={onClose}>
                {children}
            </StatusbarPopover>
        </div>
    )
}

const meta = {
    title: "Statusbar/StatusbarPopover",
    component: StatusbarPopoverDemo,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
        open: true,
        onClose: fn(),
        children: (
            <>
                <RadioListField
                    label={RADIO_LIST_LABEL}
                    value={RADIO_LIST_OPTIONS.at(0)?.value}
                    options={[...RADIO_LIST_OPTIONS]}
                    onChange={fn()}
                />
                <SliderField
                    label={SLIDER_LABEL}
                    value={SLIDER_VALUE}
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    onChange={fn()}
                />
                <SwitchField label={SWITCH_LABEL} checked onChange={fn()} />
            </>
        ),
    },
} satisfies Meta<typeof StatusbarPopoverDemo>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
